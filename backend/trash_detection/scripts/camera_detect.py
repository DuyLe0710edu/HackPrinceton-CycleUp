#!/usr/bin/env python3
"""
Real-time trash detection using webcam.
"""
import cv2
from ultralytics import YOLO
import time
import os

def load_model(model_path):
    """Load and return the YOLO model"""
    try:
        model = YOLO(model_path)
        print(f"Model loaded from {model_path}")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        return None

def process_frame(frame, model):
    """Process a single frame with the model and return the processed frame and detections"""
    if model is None:
        return frame, []
    
    # Resize for faster processing
    frame = cv2.resize(frame, (640, 480))
    
    # Perform detection
    results = model(frame, conf=0.25)
    
    # Class names for nice labels
    class_names = ['glass', 'metal', 'paper', 'plastic', 'undefined']
    
    # Define colors for each class (BGR format)
    colors = {
        'glass': (0, 255, 0),     # Green
        'metal': (0, 0, 255),     # Red
        'paper': (255, 0, 0),     # Blue
        'plastic': (0, 255, 255), # Yellow
        'undefined': (255, 0, 255)  # Purple
    }
    
    # Process results
    detections = []
    for result in results:
        boxes = result.boxes
        for box in boxes:
            # Get box coordinates and class
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            
            # Get class name (ensure it's within range)
            class_name = class_names[cls] if cls < len(class_names) else "unknown"
            color = colors.get(class_name, (255, 255, 255))  # Default white if not found
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label (text with background)
            label = f"{class_name} {conf:.2f}"
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            cv2.rectangle(frame, (x1, y1-text_size[1]-10), (x1+text_size[0], y1), color, -1)
            cv2.putText(frame, label, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Add to detections list
            detections.append({
                'class': class_name,
                'confidence': conf,
                'x': x1,
                'y': y1,
                'width': x2 - x1,
                'height': y2 - y1
            })
    
    return frame, detections

def main():
    """Main function for standalone execution"""
    print("Starting trash detection...")
    
    # Load your fine-tuned model
    model_path = '../runs/trash_detection/weights/best.pt'
    if not os.path.exists(model_path):
        print(f"Model not found at {model_path}, using default model")
        model_path = "yolov8n.pt"
    
    model = load_model(model_path)
    
    # Initialize camera
    cap = cv2.VideoCapture(0)  # Use 0 for default camera
    
    # Check if camera opened successfully
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return
    
    print("Press 'q' to quit")
    
    while True:
        # Read a frame from camera
        ret, frame = cap.read()
        if not ret:
            print("Error: Failed to capture image")
            break
        
        # Start time for FPS calculation
        start_time = time.time()
        
        # Process the frame
        processed_frame, _ = process_frame(frame, model)
        
        # Calculate FPS
        fps = 1 / (time.time() - start_time)
        cv2.putText(processed_frame, f"FPS: {fps:.1f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Display the frame
        cv2.imshow('Trash Detection', processed_frame)
        
        # Exit when 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Release resources
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main() 