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

# Import database connector
from db_connector import (
    store_recognition_data,
    get_recognition_data,
    create_tables_if_not_exist
)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")

# Global variables
model = None
detection_running = False
detection_thread = None
cap = None
camera_initialized = False

# Convert frame to base64 string for sending over websocket
def frame_to_base64(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    return base64.b64encode(buffer).decode('utf-8')

# Convert base64 string to image
def base64_to_frame(base64_string):
    img_data = base64.b64decode(base64_string.split(',')[1] if ',' in base64_string else base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def initialize_camera():
    global cap, camera_initialized

    try:
        # Close any existing camera
        if cap is not None:
            cap.release()
            time.sleep(0.5)  # Give time for camera to properly release
        
        # Explicitly set environment variables
        os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'video_codec;h264_videotoolbox'
        
        # Use camera index 0 (built-in camera)
        cap = cv2.VideoCapture(0)
        
        # Improve camera stability with explicit settings
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        
        # Warmup the camera
        for _ in range(10):
            ret, _ = cap.read()
            if not ret:
                print("Warning: Camera warmup frame not read")
        
        if not cap.isOpened():
            raise Exception("Could not open camera")
        
        camera_initialized = True
        return {"success": True, "message": "Camera initialized successfully"}
    except Exception as e:
        print(f"Error initializing camera: {e}")
        camera_initialized = False
        return {"success": False, "error": str(e)}

def detection_loop():
    global detection_running, model, cap
    print("Starting detection loop...")
    
    try:
        # Make sure model is loaded
        if model is None:
            model = load_model()
        
        detection_running = True
        
        # Process frames continuously while detection is active
        while detection_running:
            if cap is None or not cap.isOpened():
                print("Camera not initialized, reinitializing...")
                initialize_camera()
                time.sleep(0.5)
                continue
                
            # Read a frame
            ret, frame = cap.read()
            
            if not ret or frame is None or frame.size == 0:
                print("Could not read frame, trying again...")
                time.sleep(0.1)
                continue
                
            # Flip the frame horizontally for a more natural view
            frame = cv2.flip(frame, 1)
            
            # Process the frame with the model
            start_time = time.time()
            processed_frame, detections = process_frame(frame, model)
            
            # Calculate and log inference time
            inference_time = (time.time() - start_time) * 1000
            print(f"Inference time: {inference_time:.2f}ms")
            
            # Convert processed frame to base64 for sending via WebSocket
            base64_frame = frame_to_base64(processed_frame)
            
            # Send the processed frame and detections to all connected clients
            socketio.emit('detection_update', {'frame': base64_frame, 'detections': detections})
            
            # Throttle the loop to avoid overwhelming the system
            time.sleep(0.01)
    except Exception as e:
        print(f"Error in detection loop: {e}")
    finally:
        print("Detection loop ended")
        detection_running = False
        
        # Make sure camera is released
        if cap is not None:
            cap.release()
            cap = None

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

# New MediaPipe Recognition Data API Endpoints
@app.route('/api/mediapipe/store', methods=['POST'])
def store_mediapipe_data():
    """
    Store MediaPipe recognition data
    Expected JSON format:
    {
        "type": "Face" | "Pose" | "Gesture",
        "data": { ... recognition data ... }
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Validate required fields
        if 'type' not in data or 'data' not in data:
            return jsonify({"success": False, "error": "Missing required fields: type and data"}), 400
        
        # Store recognition data
        result = store_recognition_data(data['type'], data['data'])
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 500
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/mediapipe/data', methods=['GET'])
def get_mediapipe_data():
    """
    Get MediaPipe recognition data
    Query parameters:
    - type: "Face" | "Pose" | "Gesture" (optional)
    - limit: int (optional, default: 100)
    - offset: int (optional, default: 0)
    """
    try:
        # Extract query parameters
        recognition_type = request.args.get('type')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        # Get recognition data
        result = get_recognition_data(recognition_type, limit, offset)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/mediapipe/db-check', methods=['GET'])
def check_database():
    """Check database connection and table existence"""
    try:
        result = create_tables_if_not_exist()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# SocketIO events
@socketio.on('connect')
def on_connect():
    print('Client connected')

@socketio.on('disconnect')
def on_disconnect():
    print('Client disconnected')

# Handle MediaPipe recognition data via WebSocket
@socketio.on('mediapipe_recognition')
def handle_mediapipe_data(data):
    """
    Handle MediaPipe recognition data from WebSocket
    Expected data format:
    {
        "type": "Face" | "Pose" | "Gesture",
        "data": { ... recognition data ... }
    }
    """
    try:
        # Validate data
        if 'type' not in data or 'data' not in data:
            emit('mediapipe_response', {
                "success": False, 
                "error": "Missing required fields: type and data"
            })
            return
        
        # Store recognition data
        result = store_recognition_data(data['type'], data['data'])
        
        # Send response back to client
        emit('mediapipe_response', result)
    
    except Exception as e:
        emit('mediapipe_response', {
            "success": False, 
            "error": str(e)
        })

# Register cleanup function
@atexit.register
def cleanup():
    global detection_running
    detection_running = False
    print("Cleaning up resources...")

def load_model(model_path=None):
    """Load trash detection model"""
    global model
    
    try:
        # If no model path is provided, try to find the best model or use default
        if model_path is None:
            model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 
                                    'trash_detection', 'runs', 'trash_detection', 
                                    'weights', 'best.pt'))
            
            # If the specific model path doesn't exist, try the default yolov8n.pt
            if not os.path.exists(model_path):
                print(f"Model not found at {model_path}, trying yolov8n.pt")
                if os.path.exists("yolov8n.pt"):
                    model_path = "yolov8n.pt"
                else:
                    raise FileNotFoundError(f"Neither custom model nor yolov8n.pt found")
        
        print(f"Loading model from: {model_path}")
        
        # Import inside function to avoid circular imports
        from trash_detection.scripts.camera_detect import load_model as _load_model
        model = _load_model(model_path)
        print("Model loaded successfully")
        return model
        
    except Exception as e:
        print(f"Error loading model: {e}")
        # Create a simple passthrough model that doesn't do detection
        class PassthroughModel:
            def __call__(self, frame, conf=None):
                # Create a minimal result structure
                class EmptyResult:
                    def __init__(self):
                        self.boxes = []
                return [EmptyResult()]
        
        print("WARNING: Using passthrough model (no detection)")
        model = PassthroughModel()
        return model

# Initialize database when app starts
try:
    create_tables_if_not_exist()
except Exception as e:
    print(f"Error initializing database: {e}")

if __name__ == '__main__':
    print("Starting Trash Detection Backend on port 8000...")
    socketio.run(app, host='0.0.0.0', port=8000, debug=True, allow_unsafe_werkzeug=True)