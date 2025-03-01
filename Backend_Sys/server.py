from flask import Flask, request, jsonify, send_file
import subprocess
import mysql.connector
from dotenv import load_dotenv
import os
from flask_cors import CORS
import logging

# Load environment variables from a .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Directory where uploaded videos are stored
UPLOAD_DIRECTORY = "/mnt/d/ALU/Codex/Project-Trojan/Backend_Sys"

# Configure logging
logging.basicConfig(level=logging.DEBUG)

@app.route('/upload', methods=["POST"])
def upload_video():
    data = request.data
    if data:
        # Ensure the upload directory exists
        os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
        
        video_path = os.path.join(UPLOAD_DIRECTORY, 'cars.mp4')
        with open(video_path, 'wb') as file:
            file.write(data)
    
        subprocess.run(['python3', 'camera.py'])
    
        return "Video uploaded and script running in the background", 200
    else:
        return "Error happened uploading", 400

@app.route('/fetch_database', methods=["GET"])
def get_database():
    try:
        # Establish a connection to the MySQL database
        conn = mysql.connector.connect(
            host="localhost",
            user="bona",
            password="avellin",  
            database="accident_detection",
            port=3306
        )
        
        cursor = conn.cursor()
        
        # Execute a query
        cursor.execute("SELECT * FROM accidents")
        
        # Fetch all rows from the executed query
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(rows)
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)