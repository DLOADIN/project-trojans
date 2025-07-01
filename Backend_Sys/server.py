from dotenv import load_dotenv
import secrets
import threading
import time
import os
from flask import Flask, request, jsonify, send_from_directory, Response, send_file
from flask_cors import CORS
import logging
from datetime import datetime, timedelta
import mysql.connector
import bcrypt
# import subprocess
from twilio.rest import Client  
# import json
from openaiazure import analyze_video_with_yolov8

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True  
    }
})

# Directories
UPLOAD_DIRECTORY = "videos"
PROCESSED_DIRECTORY = "processed_videos"
STREAM_FRAMES_DIR = "stream_frames"

# Create directories if they don't exist
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(PROCESSED_DIRECTORY, exist_ok=True)
os.makedirs(STREAM_FRAMES_DIR, exist_ok=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
processing_videos = {}

# Twilio configuration
# Replace hardcoded Twilio credentials with:
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")  # Using your Twilio number from the screenshot
RECIPIENT_PHONE_NUMBER = "+250791291003" # The verified caller ID from your second screenshot

# Initialize Twilio client
def get_twilio_client():
    try:
        return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        logging.error(f"Failed to initialize Twilio client: {e}")
        return None

# Function to send accident notification via SMS
def send_accident_notification(accident_data):
    client = get_twilio_client()
    if not client:
        logging.error("Twilio client not available. Cannot send notification.")
        return False
    
    try:
        # Create message body with accident information
        message_body = f"""
        ACCIDENT ALERT!
        Time: {accident_data.get('timestamp', 'Unknown')}
        Location: {accident_data.get('location', 'Unknown')}
        Severity: {accident_data.get('severity_score', 'Unknown')}
        Confidence: {accident_data.get('severity_level', 'Unknown')}%
        Accuracy: {accident_data.get('accuracy', 'Unknown')}
        """
        
        # Send the message
        message = client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=RECIPIENT_PHONE_NUMBER
        )
        
        logging.info(f"Accident notification sent. SID: {message.sid}")
        return True
    except Exception as e:
        logging.error(f"Failed to send accident notification: {e}")
        return False

# Database connection
def get_db_connection():
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_DATABASE", "accident_detection"),
            port=int(os.getenv("DB_PORT", 3306))
        )
    except mysql.connector.Error as err:
        logging.error(f"Database connection error: {err}")
        return None

# Middleware to check session
def check_session():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return None

    conn = get_db_connection()
    if not conn:
        return None

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email FROM users WHERE session_token = %s AND session_expiry > NOW()", (session_token,))
        return cursor.fetchone()
    except Exception as e:
        logging.error(f"Session check error: {str(e)}")
        return None
    finally:
        cursor.close()

# Login endpoint
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            session_token = secrets.token_urlsafe(32)
            session_expiry = datetime.now() + timedelta(hours=4)  # Token expires in 4 hours
            cursor.execute("UPDATE users SET session_token = %s, session_expiry = %s WHERE id = %s",
                         (session_token, session_expiry, user['id']))
            conn.commit()
            return jsonify({
                "success": True,
                "message": "Login successful",
                "session_token": session_token,
                "user": {
                    "id": user['id'],
                    "name": user['name'],
                    "email": user['email']
                }
            })
        else:
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/get_current_user', methods=['GET'])
def get_current_user():
    user = check_session()
    if not user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    # Refresh session expiry
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        new_expiry = datetime.now() + timedelta(hours=1)
        cursor.execute("UPDATE users SET session_expiry = %s WHERE id = %s",
                     (new_expiry, user['id']))
        conn.commit()
    except Exception as e:
        logging.error(f"Session refresh error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "success": True,
        "data": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email']
        }
    })
    
# Signup endpoint
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    # Hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
                     (name, email, hashed_password))
        conn.commit()
        return jsonify({"success": True, "message": "User created successfully"})
    except mysql.connector.IntegrityError:
        return jsonify({"success": False, "message": "Email already exists"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Update profile endpoint
@app.route('/update_profile', methods=['POST'])
def update_profile():
    user = check_session()
    if not user:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json()
    new_name = data.get('name')
    new_email = data.get('email')

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET name = %s, email = %s WHERE id = %s", (new_name, new_email, user['id']))
        conn.commit()
        return jsonify({"success": True, "message": "Profile updated successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Upload video endpoint
@app.route("/upload", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return jsonify({
            "status": "error",
            "message": "No file provided"
        }), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({
            "status": "error",
            "message": "No file selected"
        }), 400

    try:
        # Use adjusted timestamp for filename
        current_time = datetime.now() - timedelta(hours=2)
        timestamp = current_time.strftime("%Y%m%d_%H%M%S")
        
        # Keep original filename but add timestamp
        original_filename = file.filename
        video_filename = f"{timestamp}_{original_filename}"
        video_path = os.path.join(UPLOAD_DIRECTORY, video_filename)
        
        # Get location from form data
        location = request.form.get("location", "Musambira (Kamonyi District)")
        
        # Save uploaded file
        file.save(video_path)
        logging.info(f"Saved video to {video_path}")
        
        # Analyze video with YOLOv8
        analysis = analyze_video_with_yolov8(video_path)
        # analysis is a dict with keys: action, confidence, total_frames, analyzed_frames
        
        # Store result in database
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(
                    "INSERT INTO accidents (timestamp, location, severity_level, severity_score, video_path, accuracy) VALUES (%s, %s, %s, %s, %s, %s)",
                    (current_time.strftime("%Y-%m-%d %H:%M:%S"), location, analysis.get("action", "Not An accident"), analysis.get("confidence", 0.0), video_path, analysis.get("confidence", 0.0))
                )
                conn.commit()
                # Get the latest accident record
                cursor.execute("SELECT * FROM accidents ORDER BY timestamp DESC LIMIT 1")
                latest_accident = cursor.fetchone()
                return jsonify({
                    "status": "success",
                    "results": latest_accident
                })
            except Exception as e:
                logging.error(f"Database error: {e}")
            finally:
                cursor.close()
                conn.close()
        # If no accident data found or database error, return an empty result with adjusted timestamp
        return jsonify({
            "status": "success",
            "message": "Video is being processed",
            "results": {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "location": location,
                "severity_level": analysis.get("action", "Processing"),
                "severity_score": analysis.get("confidence", 0.0),
                "video_path": video_path,
                "accuracy": analysis.get("confidence", 0.0)
            }
        })
        
    except Exception as e:
        logging.error(f"Error handling video upload: {e}")
        location = request.form.get("location", "Musambira (Kamonyi District)")
        return jsonify({
            "status": "success",
            "message": "Error processing video, showing latest data",
            "results": {
                "timestamp": (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
                "location": location,
                "severity_level": "Error",
                "severity_score": 0.0,
                "video_path": "",
                "accuracy": 0.0
            }
        })

# Process single video
# def process_single_video(video_path, filename, location):
#     try:
#         print(f"\nStarting video analysis for: {filename}")
        
#         # Import camera module directly
#         from camera import process_video
        
#         # Process the video using camera.py's function
#         result = process_video(video_path, location)
        
#         if result:
#             return result
#         else:
#             logging.error("Video processing failed")
#             return None
        
#     except Exception as e:
#         logging.error(f"Exception processing video: {e}")
#         return None
    
    
# Store accident information and send notification
@app.route('/report_accident', methods=['POST'])
def report_accident():
    data = request.get_json()
    user = check_session()
    
    if not user and not data.get('bypass_auth'):
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    # Expected data fields: location, severity, confidence, video_path
    required_fields = ['location', 'severity', 'confidence', 'video_path']
    for field in required_fields:
        if field not in data:
            return jsonify({"success": False, "message": f"Missing required field: {field}"}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"}), 500
    
    try:
        cursor = conn.cursor()
        timestamp = data.get('timestamp', datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        # Insert accident record into database
        cursor.execute(
            "INSERT INTO accidents (timestamp, location, severity_level, severity_score, video_path, accuracy) VALUES (%s, %s, %s, %s, %s, %s)",
            (timestamp, data['location'], data['severity_level'], data['severity_score'], data['video_path'], user['id'] if user else None)
        )
        conn.commit()
        accident_id = cursor.lastrowid
        
        # Get the full accident record
        cursor.execute("SELECT * FROM accidents WHERE id = %s", (accident_id,))
        accident_data = cursor.fetchone()
        
        # Send notification via Twilio
        notification_sent = send_accident_notification(accident_data)
        
        return jsonify({
            "success": True, 
            "message": "Accident reported successfully",
            "notification_sent": notification_sent,
            "accident_id": accident_id
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Fetch uploaded videos for the current user
@app.route('/get_user_videos', methods=['GET'])
def get_user_videos():
    user = check_session()
    if not user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    try:
        video_files = [f for f in os.listdir(PROCESSED_DIRECTORY) if f.endswith('.mp4')]
        return jsonify({"success": True, "videos": video_files})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/get_video_analysis/<filename>')
def get_video_analysis(filename):
    # Extract the timestamp from the filename format "video_YYYYMMDD_HHMMSS.mp4"
    try:
        # Parse timestamp from filename (assuming format like "video_20250330_123045.mp4")
        video_name = os.path.splitext(filename)[0]  # Remove extension
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"status": "error", "message": "Database connection error"}), 500
        
        try:
            cursor = conn.cursor(dictionary=True)
            # Look for accidents that reference this video in video_path
            cursor.execute("SELECT * FROM accidents WHERE video_path LIKE %s ORDER BY timestamp DESC LIMIT 1", 
                          (f"%{video_name}%",))
            accident_data = cursor.fetchone()
            
            if accident_data:
                return jsonify({"status": "success", "data": accident_data})
            else:
                # If no direct match, get the most recent accident
                # This is a fallback if the video filename doesn't match exactly
                cursor.execute("SELECT * FROM accidents ORDER BY timestamp DESC LIMIT 1")
                latest_accident = cursor.fetchone()
                
                if latest_accident:
                    return jsonify({"status": "success", "data": latest_accident})
                else:
                    return jsonify({"status": "error", "message": "No analysis data found"}), 404
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error processing analysis request: {str(e)}"}), 500

# Fetch accident data
@app.route('/fetch_database')
def fetch_database():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"status": "error", "message": "Database connection failed"}), 500
        
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM accidents ORDER BY id DESC")
            data = cursor.fetchall()
            return jsonify({"status": "success", "data": data})
        except mysql.connector.Error as err:
            logging.error(f"Database error: {err}")
            return jsonify({"status": "error", "message": f"Database error: {str(err)}"}), 500
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logging.error(f"Unexpected error in fetch_database: {e}")
        return jsonify({"status": "error", "message": f"Unexpected error: {str(e)}"}), 500

# Stream video frames
@app.route('/video_stream/<filename>')
def video_stream(filename):
    def generate_frames():
        base_filename = os.path.splitext(filename)[0]
        frame_path = os.path.join(STREAM_FRAMES_DIR, f"{base_filename}.jpg")
        
        while filename in processing_videos and processing_videos[filename]["status"] == "processing":
            if os.path.exists(frame_path):
                with open(frame_path, "rb") as f:
                    frame_data = f.read()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
            time.sleep(0.1)
    
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Remove or simplify processing status endpoint since we're showing real-time analysis
@app.route('/processing_status/<filename>')
def check_processing_status(filename):
    if filename in processing_videos:
        return jsonify(processing_videos[filename])
    return jsonify({"status": "not_found"})

@app.route('/logout', methods=['POST'])
def logout():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"success": False, "message": "No session token provided"}), 400

    user = check_session()  # This function should validate the session token
    if not user:
        return jsonify({"success": False, "message": "Invalid session token"}), 401

    # Invalidate the session token in the database
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET session_token = NULL, session_expiry = NULL WHERE id = %s",
                     (user['id'],))
        conn.commit()
        return jsonify({"success": True, "message": "Logout successful"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Cleanup old videos
def delete_old_videos():
    while True:
        now = time.time()
        for filename in os.listdir(PROCESSED_DIRECTORY):
            file_path = os.path.join(PROCESSED_DIRECTORY, filename)
            if now - os.path.getmtime(file_path) > 24 * 3600:
                os.remove(file_path)
        
        for filename in os.listdir(STREAM_FRAMES_DIR):
            file_path = os.path.join(STREAM_FRAMES_DIR, filename)
            if now - os.path.getmtime(file_path) > 1 * 3600:
                os.remove(file_path)
                
        time.sleep(3600)

# Start cleanup thread
threading.Thread(target=delete_old_videos, daemon=True).start()

# Add this new endpoint

# Run the app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)