import threading
import time
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
from datetime import datetime
from dotenv import load_dotenv
import mysql.connector
import subprocess
import glob

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Directory for videos
UPLOAD_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")
PROCESSED_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "processed_videos")
ACCIDENT_FRAMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "accident_frames")

os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(PROCESSED_DIRECTORY, exist_ok=True)
os.makedirs(ACCIDENT_FRAMES_DIR, exist_ok=True)

logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(levelname)s - %(message)s')

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_DATABASE", "accident_detection"),
    "port": int(os.getenv("DB_PORT", 3306)),
}

def get_db_connection():
    """Establish a connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        logging.error(f"❌ Error connecting to MySQL: {err}")
        return None

@app.route("/fetch_database", methods=["GET"])
def fetch_database():
    """Get all accident data from the database."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Could not connect to database"}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)  # Return results as dictionaries
        query = """
        SELECT id, timestamp, location, severity_level, severity_score, video_path, accuracy 
        FROM accidents 
        ORDER BY timestamp DESC
        """
        cursor.execute(query)
        accident_data = cursor.fetchall()
        
        return jsonify({"status": "success", "data": accident_data}), 200
    
    except mysql.connector.Error as err:
        logging.error(f"❌ Error fetching data: {err}")
        return jsonify({"status": "error", "message": f"Error fetching data: {str(err)}"}), 500
    
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route("/accident_frames/<filename>", methods=["GET"])
def get_accident_frame(filename):
    """Serve accident frames."""
    return send_from_directory(ACCIDENT_FRAMES_DIR, filename)

@app.route("/processing_status/<filename>", methods=["GET"])
def processing_status(filename):
    """Check if a video has been processed."""
    processed_path = os.path.join(PROCESSED_DIRECTORY, filename)
    is_processed = os.path.exists(processed_path)
    
    return jsonify({"processed": is_processed}), 200

@app.route("/upload", methods=["POST"])
def upload_video():
    """Handle video upload."""
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file provided"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"status": "error", "message": "No file selected"}), 400

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_filename = f"video_{timestamp}.mp4"
        video_path = os.path.join(UPLOAD_DIRECTORY, video_filename)

        file.save(video_path)

        logging.info(f"✅ Video saved: {video_path}")

        # Start processing in a separate thread
        threading.Thread(
            target=process_single_video, 
            args=(video_path,),
            daemon=True
        ).start()

        return jsonify({
            "status": "success",
            "message": "Video uploaded successfully",
            "videoUrl": video_filename
        }), 200

    except Exception as e:
        logging.error(f"❌ Error saving video: {str(e)}")
        return jsonify({"status": "error", "message": f"Error saving video: {str(e)}"}), 500

def process_single_video(video_path):
    """Process a single video."""
    try:
        filename = os.path.basename(video_path)
        logging.info(f"🚀 Processing video: {filename}")
        
        # Run camera.py for this specific video with robust error handling
        result = subprocess.run(
            ["python", "camera.py", video_path], 
            check=False,  # Don't raise exception on non-zero exit
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logging.error(f"❌ Error processing video {filename}: {result.stderr}")
            return
            
        # Move processed video to the processed directory
        processed_path = os.path.join(PROCESSED_DIRECTORY, filename)
        os.rename(video_path, processed_path)
        
        logging.info(f"✅ Finished processing video: {filename}")
        
    except Exception as e:
        logging.error(f"❌ Error processing video: {str(e)}")

def process_pending_videos():
    """Process any videos in the upload directory that haven't been processed yet."""
    video_files = glob.glob(os.path.join(UPLOAD_DIRECTORY, "*.mp4"))
    
    if video_files:
        logging.info(f"🔍 Found {len(video_files)} pending videos to process")
        
        for video_path in video_files:
            # Process each video in a separate thread
            threading.Thread(
                target=process_single_video,
                args=(video_path,),
                daemon=True
            ).start()
            # Small delay to prevent overwhelming the system
            time.sleep(1)
    else:
        logging.info("✅ No pending videos to process")

def video_monitor():
    """Continuously watch the videos/ folder and process new videos."""
    while True:
        try:
            for filename in os.listdir(UPLOAD_DIRECTORY):
                if filename.endswith((".mp4", ".avi", ".mov")):
                    video_path = os.path.join(UPLOAD_DIRECTORY, filename)
                    
                    # Skip files that are currently being written
                    if is_file_ready(video_path):
                        # Process in a separate thread to not block the monitoring thread
                        threading.Thread(
                            target=process_single_video,
                            args=(video_path,),
                            daemon=True
                        ).start()
                        # Small delay to prevent overwhelming the system
                        time.sleep(1)
        except Exception as e:
            logging.error(f"❌ Error in video monitoring: {str(e)}")
            
        time.sleep(5)  # Check for new videos every 5 seconds

def is_file_ready(file_path):
    """Check if a file is ready (not being written to)."""
    # Get initial file size
    initial_size = os.path.getsize(file_path)
    # Wait a bit
    time.sleep(1)
    # Get new size
    new_size = os.path.getsize(file_path)
    
    # If size hasn't changed, file is likely not being written to
    return initial_size == new_size

def check_database_connection():
    """Test database connection and report status."""
    conn = get_db_connection()
    if conn is None:
        logging.error("❌ Database connection failed. Please check your database credentials and ensure the MySQL server is running.")
        return False
    
    logging.info("✅ Successfully connected to the database.")
    conn.close()
    return True

def verify_db_table():
    """Verify that the accidents table exists and has the correct schema."""
    conn = get_db_connection()
    if conn is None:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE 'accidents'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            logging.warning("⚠️ 'accidents' table does not exist. Creating table...")
            # Create the table
            cursor.execute("""
            CREATE TABLE accidents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME NOT NULL,
                location VARCHAR(255) NOT NULL,
                severity_level ENUM('low', 'medium', 'high') NOT NULL,
                severity_score FLOAT NOT NULL,
                video_path VARCHAR(255) NOT NULL,
                accuracy FLOAT NOT NULL
            )
            """)
            conn.commit()
            logging.info("✅ 'accidents' table created successfully.")
        else:
            logging.info("✅ 'accidents' table exists.")
            
        return True
        
    except mysql.connector.Error as err:
        logging.error(f"❌ Database error: {err}")
        return False
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    # Check database connection before starting the server
    db_connected = check_database_connection()
    if not db_connected:
        logging.warning("⚠️ Server starting without database connection. Some features may not work.")
    else:
        # Verify database table
        verify_db_table()
    
    # Process any pending videos before starting the server
    process_pending_videos()
    
    # Start monitoring videos in a separate thread
    monitor_thread = threading.Thread(target=video_monitor, daemon=True)
    monitor_thread.start()
    
    logging.info("🚀 Starting Accident Detection Server")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)