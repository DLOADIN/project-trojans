import os
import sys
import cv2
import numpy as np
from datetime import datetime, timedelta
import mysql.connector
from twilio.rest import Client
import pytz
from dotenv import load_dotenv
from contextlib import contextmanager
import logging
from detection import AccidentDetectionModel

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Constants and Environment Variables
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
ADMIN_PHONE_NUMBER = os.getenv("ADMIN_PHONE_NUMBER")
LOCATION = os.getenv("LOCATION", "Kigali")

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_DATABASE", "accident_detection"),
    "port": int(os.getenv("DB_PORT", 3306))
}

# Directory setup
ACCIDENT_CLIPS_DIRECTORY = "accident_clips"
PROCESSED_DIRECTORY = "processed_videos"
os.makedirs(ACCIDENT_CLIPS_DIRECTORY, exist_ok=True)
os.makedirs(PROCESSED_DIRECTORY, exist_ok=True)

# Initialize accident detection model
try:
    MODEL_PATH = "model.json"
    WEIGHTS_PATH = "model_weights.h5"
    accident_model = AccidentDetectionModel(MODEL_PATH, WEIGHTS_PATH)
    logging.info("Accident detection model loaded successfully")
except Exception as e:
    logging.error(f"Failed to load accident detection model: {e}")
    accident_model = None

# Database connection context manager
@contextmanager
def db_connection():
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        yield conn
    except mysql.connector.Error as err:
        logging.error(f"Database connection error: {err}")
        yield None
    finally:
        if conn and conn.is_connected():
            conn.close()

def send_twilio_alert(timestamp, location, severity_level, severity_score):
    """Send accident alert via Twilio SMS"""
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"""🚨 Accident Detected!
Time: {timestamp}
Location: {location}
Severity: {severity_level.capitalize()} ({severity_score:.1f}%)
Immediate attention is required!""",
            from_=TWILIO_PHONE_NUMBER,
            to=ADMIN_PHONE_NUMBER
        )
        logging.info(f"Twilio alert sent: {message.sid}")
        return True
    except Exception as e:
        logging.error(f"Failed to send Twilio alert: {e}")
        return False

def save_accident_data(timestamp, location, severity_level, severity_score, video_filename, accuracy):
    """Save accident data to database"""
    # Adjust timestamp for timezone
    timestamp = (datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S") - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    
    with db_connection() as conn:
        if not conn:
            return False
            
        try:
            cursor = conn.cursor()
            query = """
            INSERT INTO accidents 
            (timestamp, location, severity_level, severity_score, video_path, accuracy)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                timestamp, 
                location, 
                severity_level, 
                float(severity_score), 
                video_filename, 
                float(accuracy)
            ))
            conn.commit()
            
            logging.info(f"Accident data saved: {timestamp}, {location}, {severity_level}")
            send_twilio_alert(timestamp, location, severity_level, severity_score)
            return True
            
        except mysql.connector.Error as err:
            logging.error(f"Failed to save accident data: {err}")
            return False

def process_video(video_path, output_path=None):
    """
    Process video for accident detection
    
    Args:
        video_path (str): Path to input video
        output_path (str, optional): Path for processed video output
        
    Returns:
        str: Path to processed video or None if processing failed
    """
    if not accident_model:
        logging.error("Accident detection model not initialized")
        return None

    video = cv2.VideoCapture(video_path)
    if not video.isOpened():
        logging.error(f"Could not open video: {video_path}")
        return None

    try:
        # Video properties
        fps = video.get(cv2.CAP_PROP_FPS)
        width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Initialize video writers
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = None
        out = None if not output_path else cv2.VideoWriter(
            output_path, fourcc, fps, (width, height)
        )

        # Analysis variables
        frame_count = 0
        accident_detected = False
        severity_scores = []
        accuracies = []
        consecutive_accident_frames = 0
        ACCIDENT_THRESHOLD = 5  # Number of consecutive frames needed to confirm accident
        
        # Get timestamp from video filename or current time
        timestamp_str = datetime.now(pytz.timezone('Africa/Kigali')).strftime("%Y%m%d_%H%M%S")
        
        while True:
            ret, frame = video.read()
            if not ret:
                break

            frame_count += 1
            if frame_count % 3 != 0:  # Process every 3rd frame
                continue

            # Prepare frame for model
            processed_frame = cv2.resize(frame, (250, 250))
            processed_frame = np.expand_dims(processed_frame, axis=0)
            
            # Get prediction
            pred_class, pred_probs = accident_model.predict_accident(processed_frame)
            confidence_score = float(pred_probs[0][1]) * 100  # Probability of accident class
            
            # Handle accident detection
            if pred_class == "Accident" and confidence_score > 70:
                consecutive_accident_frames += 1
                
                if consecutive_accident_frames >= ACCIDENT_THRESHOLD:
                    if writer is None:
                        accident_path = os.path.join(
                            ACCIDENT_CLIPS_DIRECTORY, 
                            f"accident_{timestamp_str}.mp4"
                        )
                        writer = cv2.VideoWriter(
                            accident_path, fourcc, fps, (width, height)
                        )
                        accident_detected = True
                    
                    writer.write(frame)
                    severity_scores.append(confidence_score)
                    accuracies.append(confidence_score)
                    
                    # Add visual indicator
                    cv2.putText(
                        frame,
                        f"ACCIDENT {confidence_score:.1f}%",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 0, 255),
                        2
                    )
            else:
                consecutive_accident_frames = 0

            if out:
                out.write(frame)

            # Update progress
            if frame_count % 30 == 0:
                progress = (frame_count / total_frames) * 100
                logging.info(f"Processing progress: {progress:.1f}%")

        # Save accident data if detected
        if accident_detected and severity_scores:
            avg_severity = sum(severity_scores) / len(severity_scores)
            avg_accuracy = sum(accuracies) / len(accuracies)
            
            severity_level = (
                "low" if avg_accuracy <= 70
                else "medium" if avg_accuracy <= 85
                else "fatal"
            )
            
            save_accident_data(
                timestamp=datetime.now(pytz.timezone('Africa/Kigali')).strftime("%Y-%m-%d %H:%M:%S"),
                location=LOCATION,
                severity_level=severity_level,
                severity_score=avg_severity,
                video_filename=os.path.basename(video_path),
                accuracy=avg_accuracy
            )
            
            # Print accuracy for server capture
            print(avg_accuracy)

        return output_path if output_path else video_path

    except Exception as e:
        logging.error(f"Error processing video: {e}")
        return None
        
    finally:
        # Cleanup
        video.release()
        if out:
            out.release()
        if writer:
            writer.release()




if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        if not os.path.isfile(video_path):
            logging.error(f"Video file not found: {video_path}")
            sys.exit(1)
            
        output_path = os.path.join(PROCESSED_DIRECTORY, os.path.basename(video_path))
        result = process_video(video_path, output_path)
        
        if not result:
            logging.error("Video processing failed")
            sys.exit(1)
    else:
        logging.error("No video path provided")
        sys.exit(1)