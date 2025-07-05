import cv2

def open_camera():
    """
    Simple function to open and display the PC camera feed.
    Press 'q' to quit the camera.
    """
    # Initialize the camera (0 is usually the default/built-in camera)
    cap = cv2.VideoCapture(0)
    
    # Check if camera opened successfully
    if not cap.isOpened():
        print("Error: Could not open camera")
        return
    
    print("Camera opened successfully! Press 'q' to quit.")
    
    while True:
        # Capture frame-by-frame
        ret, frame = cap.read()
        
        # If frame is read correctly ret is True
        if not ret:
            print("Error: Can't receive frame from camera")
            break
        
        # Display the frame
        cv2.imshow('Camera Feed', frame)
        
        # Wait for 'q' key to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Release everything when job is finished
    cap.release()
    cv2.destroyAllWindows()
    print("Camera closed.")

if __name__ == "__main__":
    open_camera()