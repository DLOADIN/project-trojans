import cv2
from ultralytics import YOLO
from collections import Counter
import time
import numpy as np

def compute_iou(box1, box2):
    # box: [x1, y1, x2, y2]
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - inter_area
    if union_area == 0:
        return 0
    return inter_area / union_area

def center_distance(box1, box2):
    cx1 = (box1[0] + box1[2]) / 2
    cy1 = (box1[1] + box1[3]) / 2
    cx2 = (box2[0] + box2[2]) / 2
    cy2 = (box2[1] + box2[3]) / 2
    return np.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2)

def analyze_video_with_yolov8(video_path):
    """
    Analyzes a video using YOLOv8, shows real-time progress, and returns a summary dict.
    Detects vehicle collisions or vehicles getting very close as accidents.
    """
    model = YOLO('yolov8n.pt')
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_rate = cap.get(cv2.CAP_PROP_FPS)
    target_duration = 20  # seconds
    actual_video_duration = total_frames / frame_rate if frame_rate > 0 else 0
    frame_step = 1  # process every frame
    delay_per_frame = max(0, (target_duration - actual_video_duration) / total_frames) if total_frames > 0 else 0

    frame_idx = 0
    processed_frames = 0
    detected_classes = []
    accident_frames = 0
    start_time = time.time()

    vehicle_classes = {'car', 'truck', 'bus', 'motorcycle'}

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        results = model(frame)
        boxes = results[0].boxes
        names = results[0].names
        frame_classes = set()
        vehicle_boxes = []
        vehicle_labels = []
        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                cls_id = int(box.cls[0])
                class_name = names[cls_id]
                detected_classes.append(class_name)
                frame_classes.add(class_name)
                xyxy = box.xyxy[0].cpu().numpy().astype(int)
                conf = float(box.conf[0])
                cv2.rectangle(frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]), (0,255,0), 2)
                cv2.putText(frame, f"{class_name} {conf:.2f}", (xyxy[0], xyxy[1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
                if class_name in vehicle_classes:
                    vehicle_boxes.append(xyxy)
                    vehicle_labels.append(class_name)
        # Check for vehicle collisions or closeness
        accident_this_frame = False
        for i in range(len(vehicle_boxes)):
            for j in range(i+1, len(vehicle_boxes)):
                iou = compute_iou(vehicle_boxes[i], vehicle_boxes[j])
                dist = center_distance(vehicle_boxes[i], vehicle_boxes[j])
                frame_width = frame.shape[1]
                # If IoU > 0.1 (overlap) or centers are within 10% of frame width, flag as accident
                if iou > 0.1 or dist < 0.1 * frame_width:
                    accident_this_frame = True
                    # Draw a red rectangle around both vehicles
                    cv2.rectangle(frame, (vehicle_boxes[i][0], vehicle_boxes[i][1]), (vehicle_boxes[i][2], vehicle_boxes[i][3]), (0,0,255), 3)
                    cv2.rectangle(frame, (vehicle_boxes[j][0], vehicle_boxes[j][1]), (vehicle_boxes[j][2], vehicle_boxes[j][3]), (0,0,255), 3)
        if accident_this_frame:
            accident_frames += 1
            cv2.putText(frame, "ACCIDENT DETECTED!", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0,0,255), 4)
            print("ACCIDENT DETECTED!")
        processed_frames += 1
        cv2.putText(frame, f"Progress: {processed_frames}/{total_frames}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
        cv2.imshow('YOLOv8 Real-Time Analysis', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        if delay_per_frame > 0:
            time.sleep(delay_per_frame)
        frame_idx += 1
    cap.release()
    cv2.destroyAllWindows()
    # Aggregate results
    if detected_classes:
        most_common_class, count = Counter(detected_classes).most_common(1)[0]
        confidence = count / len(detected_classes)
    else:
        most_common_class = 'Unknown'
        confidence = 0.0
    if processed_frames > 0:
        accident_ratio = accident_frames / processed_frames
        accident_probability = 0.3 + 0.7 * accident_ratio if accident_frames > 0 else 0.0
    else:
        accident_probability = 0.0
    return {
        'action': most_common_class,
        'confidence': confidence,
        'total_frames': total_frames,
        'analyzed_frames': processed_frames,
        'accident_probability': round(accident_probability * 100, 2)  # as percentage
    }

