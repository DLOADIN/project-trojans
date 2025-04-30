import cv2
from detection import AccidentDetectionModel
import numpy as np
import os
import mysql.connector
from datetime import datetime
import time
import json
from twilio.rest import Client
import logging
from dotenv import load_dotenv

load_dotenv()

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
RECIPIENT_PHONE_NUMBER = "+250791291003"  

model = AccidentDetectionModel("model.json", 'model_weights.h5')
font = cv2.FONT_HERSHEY_SIMPLEX

# Configure logging
logging.basicConfig(level=logging.INFO)

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'accident_detection',
    'port': 3306
}

# Create uploads directory if it doesn't exist
UPLOADS_DIR = "uploads"
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

def get_twilio_client():
    try:
        return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        logging.error(f"Failed to initialize Twilio client: {e}")
        return None

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
        Confidence: {accident_data.get('severity_level', 'Unknown')}
        Accuracy: {accident_data.get('accuracy', 'Unknown')}%
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

def save_summary_to_db(timestamp, location, prediction_summary, severity_level, severity_score, video_path, accuracy):
    try:
        # Convert prediction_summary to JSON string if it's a dict
        if isinstance(prediction_summary, dict):
            prediction_summary_str = json.dumps(prediction_summary)
        else:
            prediction_summary_str = str(prediction_summary)

        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        query = """
        INSERT INTO accidents 
        (timestamp, location, severity_level, severity_score, video_path, accuracy) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        values = (
            timestamp,
            location,
            severity_level,
            float(severity_score),
            video_path,
            float(accuracy)
        )
        
        cursor.execute(query, values)
        conn.commit()
        
        print(f"\nData successfully saved to database with ID: {cursor.lastrowid}")
        
        # Prepare accident data for notification
        accident_data = {
            'timestamp': timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            'location': location,
            'severity_score': f"{float(severity_score):.2f}",
            'severity_level': severity_level,
            'accuracy': f"{float(accuracy):.2f}"
        }
        
        # Send notification
        if send_accident_notification(accident_data):
            print("Accident notification sent successfully!")
        else:
            print("Failed to send accident notification.")
        
    except mysql.connector.Error as err:
        print(f"\nError saving to database: {err}")
        print("Error details:")
        print(f"Error Code: {err.errno}")
        print(f"SQLSTATE: {err.sqlstate}")
        print(f"Error Message: {err.msg}")
    except Exception as e:
        print(f"\nUnexpected error: {str(e)}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def preprocess_frame(frame):
    # Convert to RGB and normalize
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    # Apply histogram equalization to each channel
    frame_yuv = cv2.cvtColor(frame, cv2.COLOR_RGB2YUV)
    frame_yuv[:,:,0] = cv2.equalizeHist(frame_yuv[:,:,0])
    frame = cv2.cvtColor(frame_yuv, cv2.COLOR_YUV2RGB)
    # Normalize
    frame = frame.astype('float32') / 255.0
    return frame

def calculate_motion_metrics(prev_frame, current_frame):
    if prev_frame is None:
        return 0, 0, 0
    
    # Calculate absolute difference
    diff = cv2.absdiff(prev_frame, current_frame)
    # Convert to grayscale
    gray = cv2.cvtColor(diff, cv2.COLOR_RGB2GRAY)
    
    # Calculate basic motion score
    motion_score = np.mean(gray)
    
    # Calculate motion variance (sudden changes)
    motion_variance = np.var(gray)
    
    # Calculate motion area (percentage of frame with motion)
    _, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)
    motion_area = np.sum(thresh > 0) / (thresh.shape[0] * thresh.shape[1])
    
    return motion_score, motion_variance, motion_area

def calculate_confidence_score(prob, motion_metrics):
    motion_score, motion_variance, motion_area = motion_metrics
    
    # Base confidence on prediction probability
    base_confidence = max(prob[0][0], prob[0][1])
    
    # Adjust confidence based on motion characteristics
    motion_factor = min(1.0, motion_score * 2)  # Normalize motion score
    variance_factor = min(1.0, motion_variance * 10)  # Normalize variance
    area_factor = min(1.0, motion_area * 2)  # Normalize area
    
    # Combined confidence score
    confidence = base_confidence * (0.4 + 0.2 * motion_factor + 0.2 * variance_factor + 0.2 * area_factor)
    
    return min(1.0, confidence)  # Ensure confidence is between 0 and 1

def determine_severity_level(prob, motion_metrics):
    motion_score, motion_variance, motion_area = motion_metrics
    
    # Calculate severity score based on probability and motion metrics
    severity_score = (prob * 0.6 + motion_score * 0.2 + motion_variance * 0.1 + motion_area * 0.1) * 100
    
    # Determine severity level based on score
    if severity_score >= 80:
        return "High", severity_score
    elif severity_score >= 50:
        return "Medium", severity_score
    else:
        return "Low", severity_score

def startapplication():
    video = cv2.VideoCapture('cars.mp4')
    prev_frame = None
    confidence_threshold = 0.75
    motion_threshold = 0.15
    temporal_window = 5
    predictions = []
    motion_history = []
    
    # Get video properties
    frame_width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(video.get(cv2.CAP_PROP_FPS))
    
    # Create video writer
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(UPLOADS_DIR, f"accident_{timestamp}.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
    
    # Initialize prediction tracking
    all_predictions = []
    frame_count = 0
    
    print("\nStarting video processing...")
    
    while True:
        ret, frame = video.read()
        if not ret or frame is None:
            print("\nVideo processing completed")
            break
            
        frame_count += 1
        
        # Preprocess frame
        processed_frame = preprocess_frame(frame)
        roi = cv2.resize(processed_frame, (250, 250))
        
        # Calculate motion metrics
        motion_metrics = calculate_motion_metrics(prev_frame, processed_frame)
        prev_frame = processed_frame.copy()
        
        # Get prediction
        pred, prob = model.predict_accident(roi[np.newaxis, :, :])
        prediction_value = round(prob[0][0]*100, 2)  # Use accident probability as prediction value
        
        # Calculate confidence score
        confidence = calculate_confidence_score(prob, motion_metrics)
        
        # Add to temporal windows
        predictions.append((prediction_value, confidence))
        motion_history.append(motion_metrics[0])  # Store motion score
        
        if len(predictions) > temporal_window:
            predictions.pop(0)
            motion_history.pop(0)
        
        # Calculate smoothed prediction
        if predictions:
            smoothed_prediction = np.mean([p[0] for p in predictions])
            avg_confidence = np.mean([p[1] for p in predictions])
            avg_motion = np.mean(motion_history)
        else:
            smoothed_prediction = prediction_value
            avg_confidence = confidence
            avg_motion = motion_metrics[0]
        
        # Store prediction for summary
        all_predictions.append(smoothed_prediction)
        
        # Determine if detection is reliable
        is_reliable = avg_confidence >= confidence_threshold
        has_significant_motion = avg_motion > motion_threshold
        
        # Display real-time prediction
        cv2.rectangle(frame, (0, 0), (400, 80), (0, 0, 0), -1)
        cv2.putText(frame, f"Prediction: {smoothed_prediction:.1f}%", (20, 30), font, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Motion: {avg_motion:.2f}", (20, 60), font, 0.7, (255, 255, 0), 2)
        
        # Write frame to video file
        out.write(frame)
        
        # Print to console
        print(f"\rFrame {frame_count}: Prediction: {smoothed_prediction:.1f}% | Motion: {avg_motion:.2f} | Reliability: {'High' if is_reliable else 'Low'}", end="")

        if cv2.waitKey(33) & 0xFF == ord('q'):
            break
        cv2.imshow('Video', frame)  

    # Calculate final summary statistics
    if all_predictions:
        final_prediction = np.mean(all_predictions)
        prediction_std = np.std(all_predictions)
        max_prediction = max(all_predictions)
        min_prediction = min(all_predictions)
        
        # Create prediction summary
        prediction_summary = {
            'mean': float(final_prediction),
            'std': float(prediction_std),
            'max': float(max_prediction),
            'min': float(min_prediction),
            'total_frames': frame_count
        }
        
        print("\nCalculating final statistics...")
        
        # Determine final severity level
        severity_level, severity_score = determine_severity_level(final_prediction/100, motion_metrics)
        
        print("\nSaving to database and sending notification...")
        
        # Save summary to database and send notification
        save_summary_to_db(
            timestamp=datetime.now(),
            location="Kigali",
            prediction_summary=prediction_summary,
            severity_level=severity_level,
            severity_score=float(severity_score),
            video_path=output_path,
            accuracy=float(final_prediction)
        )

    # Release resources
    video.release()
    out.release()
    cv2.destroyAllWindows()
    print(f"\nVideo saved to: {output_path}")

if __name__ == '__main__':
    startapplication()