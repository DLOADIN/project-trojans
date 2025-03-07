import threading
import time
import os
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import logging
from datetime import datetime
import subprocess
import mysql.connector
from dotenv import load_dotenv
import cv2

load_dotenv()

app = Flask(__name__)
CORS(app)

# Directories
UPLOAD_DIRECTORY = "videos"
PROCESSED_DIRECTORY = "processed_videos"
ACCIDENT_FRAMES_DIR = "accident_frames"
STREAM_FRAMES_DIR = "stream_frames"

os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(PROCESSED_DIRECTORY, exist_ok=True)
os.makedirs(ACCIDENT_FRAMES_DIR, exist_ok=True)
os.makedirs(STREAM_FRAMES_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO)

# Dictionary to keep track of processing videos
processing_videos = {}

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

@app.route("/upload", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"status": "error", "message": "No file selected"}), 400

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    video_filename = f"video_{timestamp}.mp4"
    video_path = os.path.join(UPLOAD_DIRECTORY, video_filename)
    file.save(video_path)

    # Add to processing_videos dictionary
    processing_videos[video_filename] = {"status": "processing", "progress": 0}

    threading.Thread(target=process_single_video, args=(video_path, video_filename), daemon=True).start()
    return jsonify({"status": "success", "videoUrl": video_filename}), 200

@app.route('/fetch_database')
def fetch_database():
    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error"}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM accidents ORDER BY timestamp DESC")
        data = cursor.fetchall()
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/get_video/<filename>')
def get_video(filename):
    return send_from_directory(PROCESSED_DIRECTORY, filename)

@app.route('/processing_status/<filename>')
def check_processing_status(filename):
    if filename in processing_videos:
        return jsonify(processing_videos[filename])
    processed_path = os.path.join(PROCESSED_DIRECTORY, filename)
    return jsonify({"status": "completed", "processed": os.path.exists(processed_path)})

@app.route('/video_stream/<filename>')
def video_stream(filename):
    """
    Endpoint for streaming the latest frame of a processing video
    """
    def generate_frames():
        base_filename = os.path.splitext(filename)[0]
        frame_path = os.path.join(STREAM_FRAMES_DIR, f"{base_filename}.jpg")
        
        while filename in processing_videos and processing_videos[filename]["status"] == "processing":
            if os.path.exists(frame_path):
                with open(frame_path, "rb") as f:
                    frame_data = f.read()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
            time.sleep(0.1)  # Small delay to prevent excessive CPU usage
    
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
    
def process_single_video(video_path, filename):
    try:
        # Start processing
        processing_videos[filename]["progress"] = 10
        
        # Call camera.py to process the video and get the processed file name
        output_path = os.path.join(PROCESSED_DIRECTORY, filename)
        result = subprocess.run(["python", "camera.py", video_path], capture_output=True, text=True)
        
        if result.returncode == 0:
            processing_videos[filename]["status"] = "completed"
            processing_videos[filename]["progress"] = 100
            logging.info(f"Processed video: {output_path}")
        else:
            processing_videos[filename]["status"] = "error"
            logging.error(f"Error processing video: {result.stderr}")
    except Exception as e:
        processing_videos[filename]["status"] = "error"
        logging.exception(f"Exception processing video: {e}")
    finally:
        # Clean up the original video if needed
        if os.path.exists(video_path):
            os.remove(video_path)

def delete_old_videos():
    while True:
        now = time.time()
        for filename in os.listdir(PROCESSED_DIRECTORY):
            file_path = os.path.join(PROCESSED_DIRECTORY, filename)
            if now - os.path.getmtime(file_path) > 24 * 3600:
                os.remove(file_path)
        
        # Also clean up stream frames
        for filename in os.listdir(STREAM_FRAMES_DIR):
            file_path = os.path.join(STREAM_FRAMES_DIR, filename)
            if now - os.path.getmtime(file_path) > 1 * 3600:  # Remove after 1 hour
                os.remove(file_path)
                
        time.sleep(3600)

threading.Thread(target=delete_old_videos, daemon=True).start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)