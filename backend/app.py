#!/usr/bin/env python3
"""
Backend API for Trash Detection Application
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import base64
import time
import threading
from flask_socketio import SocketIO, emit
import sys
import atexit

# Add trash_detection to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import from trash_detection
from trash_detection.scripts.camera_detect import load_model, process_frame

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")

# Global variables
model = None
detection_running = False
detection_thread = None

# Convert frame to base64 string for sending over websocket
def frame_to_base64(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    return base64.b64encode(buffer).decode('utf-8')

# Convert base64 string to image
def base64_to_frame(base64_string):
    img_data = base64.b64decode(base64_string.split(',')[1] if ',' in base64_string else base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

# Detection loop - will run in a separate thread
def detection_loop():
    global detection_running, model
    
    # Load model if not loaded
    if model is None:
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 
                                    'trash_detection', 'runs', 'trash_detection', 
                                    'weights', 'best.pt'))
        if os.path.exists(model_path):
            print(f"Loading model from {model_path}")
            model = load_model(model_path)
        else:
            print(f"Model not found at {model_path}, using default model")
            model = load_model("yolov8n.pt")
    
    # If model is still None after loading attempts, exit the thread
    if model is None:
        print("ERROR: Failed to load any model, detection cannot continue")
        detection_running = False
        return
    
    # Use only the built-in camera (index 0)
    print("Opening built-in camera (index 0)...")
    cap = cv2.VideoCapture(0)
    
    # Try with macOS-specific settings if regular opening fails
    if not cap.isOpened():
        try:
            print("Trying macOS specific camera settings...")
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
            cap.set(cv2.CAP_PROP_FPS, 30)
        except Exception as e:
            print(f"Error with macOS camera settings: {e}")
    
    if not cap.isOpened():
        print("Error: Could not open built-in camera")
        detection_running = False
        return
    
    print("Detection started with built-in camera")
    
    # Set camera properties for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    # Read and discard the first few frames to let the camera warm up
    for _ in range(5):
        cap.read()
        time.sleep(0.1)
    
    frame_count = 0
    while detection_running:
        ret, frame = cap.read()
        if not ret:
            print("Error: Failed to capture image")
            # Try to reconnect a few times before giving up
            frame_count += 1
            if frame_count > 5:  # If we fail 5 frames in a row, try to reconnect
                print("Attempting to reconnect to camera...")
                cap.release()
                cap = cv2.VideoCapture(0)
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
                cap.set(cv2.CAP_PROP_FPS, 30)
                frame_count = 0
                time.sleep(1)  # Wait a second before retrying
            continue
        
        frame_count = 0  # Reset counter on successful frame
        
        # Flip the frame horizontally for a more natural view
        frame = cv2.flip(frame, 1)
        
        # Process the frame
        processed_frame, detections = process_frame(frame, model)
        
        # Encode the frame to base64
        frame_base64 = frame_to_base64(processed_frame)
        
        # Emit frame and detections through socket
        socketio.emit('detection_update', {
            'frame': frame_base64,
            'detections': detections,
            'timestamp': time.time()
        })
        
        # Slow down to avoid overloading the browser
        time.sleep(0.05)
    
    # Release camera
    if cap and cap.isOpened():
        cap.release()
    print("Camera released")

# Routes
@app.route('/')
def index():
    return jsonify({"status": "Trash Detection Backend API Running", "version": "1.0.0"})

@app.route('/api/info', methods=['GET'])
def api_info():
    model_path = os.path.join('trash_detection', 'runs', 'trash_detection', 'weights', 'best.pt')
    model_status = "Available" if os.path.exists(model_path) else "Not found (will use default)"
    
    return jsonify({
        "status": "ok",
        "model_status": model_status,
        "detection_running": detection_running,
        "classes": ['glass', 'metal', 'paper', 'plastic', 'undefined']
    })

@app.route('/api/start-detection', methods=['POST'])
def start_detection():
    global detection_running, detection_thread
    
    if detection_running:
        return jsonify({"status": "Detection already running"})
    
    # Start detection in a separate thread
    detection_running = True
    detection_thread = threading.Thread(target=detection_loop)
    detection_thread.daemon = True
    detection_thread.start()
    
    return jsonify({"status": "Detection started"})

@app.route('/api/stop-detection', methods=['POST'])
def stop_detection():
    global detection_running
    
    if not detection_running:
        return jsonify({"status": "Detection not running"})
    
    detection_running = False
    # Wait for thread to terminate
    if detection_thread and detection_thread.is_alive():
        detection_thread.join(timeout=2.0)
    
    return jsonify({"status": "Detection stopped"})

# SocketIO events
@socketio.on('connect')
def on_connect():
    print('Client connected')

@socketio.on('disconnect')
def on_disconnect():
    print('Client disconnected')

# Register cleanup function
@atexit.register
def cleanup():
    global detection_running
    detection_running = False
    print("Cleaning up resources...")

if __name__ == '__main__':
    print("Starting Trash Detection Backend on port 8000...")
    socketio.run(app, host='0.0.0.0', port=8000, debug=True, allow_unsafe_werkzeug=True)