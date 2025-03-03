import os
import cv2
from detection import AccidentDetectionModel
from twilio.rest import Client
import numpy as np
import mysql.connector
from datetime import datetime

# Create output directory for temporary videos
OUTPUT_DIR = "accident_videos"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Set the OpenCV backend to GTK
os.environ["OPENCV_VIDEOIO_PRIORITY_MSMF"] = "0"
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Initialize the accident detection model
model = AccidentDetectionModel("model.json", 'model_weights.h5')
font = cv2.FONT_HERSHEY_SIMPLEX

# Twilio configuration
account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_client = Client(account_sid, auth_token)
from_phone_number = os.getenv('TWILIO_FROM_PHONE_NUMBER')
to_phone_number = os.getenv('TWILIO_TO_PHONE_NUMBER')

# Function to connect to MySQL
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="",
            password="",  
            database="accident_detection",
            port=3306
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None

def save_accident_data(timestamp, location, severity_level, severity_score, video_path, accuracy):
    conn = get_db_connection()
    if conn is None:
        return

    try:
        cursor = conn.cursor()
        query = """
        INSERT INTO accidents (timestamp, location, severity_level, severity_score, video_path, accuracy)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        # Convert numpy.float32 to Python float
        severity_score = float(severity_score)
        accuracy = float(accuracy)

        cursor.execute(query, (timestamp, location, severity_level, severity_score, video_path, accuracy))
        conn.commit()
        print("✅ Accident data saved to the database.")
    except mysql.connector.Error as err:
        print(f"❌ Error saving data to MySQL: {err}")
    finally:
        cursor.close()
        conn.close()

def send_message(location, video_path):
    message = twilio_client.messages.create(
        body=f"Accident detected at {location} {datetime.now()} KK508st. Please respond immediately!",
        from_=from_phone_number,
        to=to_phone_number
    )
    print(f"✅ Message sent: {message.sid}")

def startapplication():
    # Video source configuration
    VIDEO_PATH = 'cars.mp4'
    
    # Check if video file exists
    if not os.path.exists(VIDEO_PATH):
        print(f"Error: Video file '{VIDEO_PATH}' not found!")
        print(f"Current working directory: {os.getcwd()}")
        print("Please make sure the video file is in the correct location.")
        return

    # Initialize video capture with error handling
    video = cv2.VideoCapture(VIDEO_PATH)
    if not video.isOpened():
        print(f"Error: Could not open video file '{VIDEO_PATH}'")
        print("Please check if the video file is corrupted or if OpenCV is properly installed.")
        return

    # Get video properties with validation
    frame_width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(video.get(cv2.CAP_PROP_FPS))

    if frame_width == 0 or frame_height == 0:
        print("Error: Invalid video dimensions detected")
        video.release()
        return

    print(f"Video loaded successfully:")
    print(f"Resolution: {frame_width}x{frame_height}")
    print(f"FPS: {fps}")

    video_writer = None
    probabilities = []
    current_video_path = None

    while True:
        ret, frame = video.read()
        if not ret:
            print("End of video stream or error reading frame")
            break

        try:
            # Process the frame
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            roi = cv2.resize(rgb_frame, (250, 250))

            # Predict accident
            pred, prob = model.predict_accident(roi[np.newaxis, :, :, :])
            if pred == "Accident":
                prob = round(prob[0][0] * 100, 2)
                probabilities.append(prob)
                severity_score = prob
                severity_level = "high" if severity_score > 70 else "medium" if severity_score > 30 else "low"
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                location = "Kigali"
                
                # Initialize video writer if not already initialized
                if video_writer is None:
                    try:
                        # Try different codecs in order of preference
                        codecs = [
                            ('mp4v', '.mp4'),
                            ('XVID', '.avi'),
                            ('MJPG', '.avi'),
                            ('WMV1', '.wmv')
                        ]
                        
                        for codec, ext in codecs:
                            try:
                                fourcc = cv2.VideoWriter_fourcc(*codec)
                                current_video_path = os.path.join(OUTPUT_DIR, f"accident_{timestamp}{ext}")
                                video_writer = cv2.VideoWriter(current_video_path, fourcc, fps, (frame_width, frame_height))
                                
                                if video_writer.isOpened():
                                    print(f"Successfully initialized video writer with codec: {codec}")
                                    break
                                else:
                                    video_writer = None
                            except Exception as codec_error:
                                print(f"Failed to initialize codec {codec}: {codec_error}")
                                continue
                        
                        if video_writer is None:
                            print("Failed to initialize video writer with any available codec")
                            continue
                            
                    except Exception as e:
                        print(f"Error initializing video writer: {e}")
                        video_writer = None
                        continue

                # Save the video frame
                if video_writer is not None:
                    video_writer.write(frame)

                # Save to database when detection is complete
                if video_writer is not None and len(probabilities) >= 30:  # Save after ~1 second of detection
                    video_writer.release()
                    
                    # Save data to the database with the local video path
                    save_accident_data(timestamp, location, severity_level, severity_score, current_video_path, prob)
                    
                    # Reset video writer for next recording
                    video_writer = None
                    current_video_path = None
                    probabilities = []  # Reset probabilities for next detection

                # Display the prediction on the frame
                cv2.rectangle(frame, (0, 0), (280, 40), (0, 0, 0), -1)
                cv2.putText(frame, f"{pred} {prob}%", (20, 30), font, 1, (255, 255, 0), 2)

            # Display the frame
            cv2.imshow('Accident Detection', frame)

            # Exit on 'q' key press
            if cv2.waitKey(33) & 0xFF == ord('q'):
                break

        except Exception as e:
            print(f"Error processing frame: {e}")
            break

    # Calculate the average probability and send message with video path
    if probabilities and current_video_path:
        average_prob = sum(probabilities) / len(probabilities)
        if average_prob >= 80:
            send_message(location, current_video_path)

    # Release resources
    video.release()
    if video_writer is not None:
        video_writer.release()
    cv2.destroyAllWindows()

# Run the application
if __name__ == '__main__':
    startapplication()