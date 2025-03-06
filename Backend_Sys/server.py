import threading
import time
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
from datetime import datetime
import subprocess

app = Flask(__name__)
CORS(app)

# Directories
UPLOAD_DIRECTORY = "videos"
PROCESSED_DIRECTORY = "processed_videos"
ACCIDENT_FRAMES_DIR = "accident_frames"

# Ensure directories exist
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(PROCESSED_DIRECTORY, exist_ok=True)
os.makedirs(ACCIDENT_FRAMES_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO)

@app.route("/upload", methods=["POST"])
def upload_video():
    """Handle video upload."""
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"status": "error", "message": "No file selected"}), 400

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    video_filename = f"video_{timestamp}.mp4"
    video_path = os.path.join(UPLOAD_DIRECTORY, video_filename)

    file.save(video_path)
    logging.info(f"✅ Video uploaded: {video_filename}")

    # Start processing in a separate thread
    threading.Thread(target=process_single_video, args=(video_path,), daemon=True).start()

    return jsonify({"status": "success", "videoUrl": video_filename}), 200

def process_single_video(video_path):
    """Process the uploaded video."""
    filename = os.path.basename(video_path)
    logging.info(f"🚀 Processing video: {filename}")

    result = subprocess.run(["python", "camera.py", video_path], check=False, capture_output=True, text=True)

    if result.returncode != 0:
        logging.error(f"❌ Error processing video {filename}: {result.stderr}")
        return

    # Move video to processed folder
    processed_path = os.path.join(PROCESSED_DIRECTORY, filename)
    os.rename(video_path, processed_path)
    logging.info(f"✅ Moved processed video to: {processed_path}")

def delete_old_videos():
    """Delete processed videos after 24 hours."""
    while True:
        now = time.time()
        for filename in os.listdir(PROCESSED_DIRECTORY):
            file_path = os.path.join(PROCESSED_DIRECTORY, filename)
            if now - os.path.getmtime(file_path) > 24 * 3600:
                os.remove(file_path)
                logging.info(f"🗑️ Deleted old video: {filename}")
        time.sleep(3600)

# Start auto-delete thread
threading.Thread(target=delete_old_videos, daemon=True).start()

if __name__ == "__main__":
    logging.info("🚀 Starting Flask Server")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
