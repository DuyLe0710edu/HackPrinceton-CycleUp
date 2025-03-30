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
import json
import google.generativeai as genai
from datetime import datetime, timedelta
from db_connector import get_client
import livekit_service

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
gemini_configured = False

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
        
        print("Initializing camera with simplified approach...")
        
        # Use the simplest possible initialization method first
        cap = cv2.VideoCapture(0)
        
        # For macOS, set specific properties
        if sys.platform == 'darwin':
            # Set preferred capture properties
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            # Check if camera opened successfully
            if not cap.isOpened():
                print("First attempt failed, trying macOS AVFoundation backend...")
                cap.release()
                
                # Try with explicit AVFoundation backend 
                cap = cv2.VideoCapture(0, cv2.CAP_AVFOUNDATION)
                
                # If still not working, try index 1 (sometimes needed for external cameras)
                if not cap.isOpened():
                    print("Trying camera index 1 with AVFoundation...")
                    cap.release()
                    cap = cv2.VideoCapture(1, cv2.CAP_AVFOUNDATION)
        else:
            # For non-macOS, set standard properties
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
        
        # Final check and warmup
        if cap.isOpened():
            # Warm up the camera with a few reads
            for _ in range(5):
                ret, _ = cap.read()
                if not ret:
                    print("Warning: Camera warmup frame not read")
            
            camera_initialized = True
            print("Camera initialized successfully")
            return {"success": True, "message": "Camera initialized successfully"}
        else:
            raise Exception("Could not open camera after multiple attempts")
    
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
        
        # Setup camera retry variables
        last_successful_frame_time = time.time()
        retry_count = 0
        consecutive_failures = 0
        
        # Process frames continuously while detection is active
        while detection_running:
            # Check if camera is initialized
            if cap is None or not cap.isOpened():
                print("Camera not initialized or closed, reinitializing...")
                initialize_camera()
                time.sleep(0.5)
                continue
            
            # Read a frame (with simpler error handling)
            try:
                ret, frame = cap.read()
            except Exception as e:
                print(f"Exception during camera read: {e}")
                ret, frame = False, None
            
            # Handle failed reads
            if not ret or frame is None or frame.size == 0:
                consecutive_failures += 1
                print(f"Failed to read frame (failure #{consecutive_failures})")
                
                # If we've had several consecutive failures, reinitialize camera
                if consecutive_failures >= 5:
                    print("Multiple consecutive failures, reinitializing camera...")
                    if cap is not None:
                        cap.release()
                        cap = None
                    initialize_camera()
                    consecutive_failures = 0
                    time.sleep(0.5)
                else:
                    # Short pause before retry
                    time.sleep(0.1)
                continue
            
            # Reset failure counter on successful frame read
            consecutive_failures = 0
            last_successful_frame_time = time.time()
            
            # Flip the frame horizontally for a more natural view
            frame = cv2.flip(frame, 1)
            
            # Process the frame with the model
            start_time = time.time()
            processed_frame, detections = process_frame(frame, model)
            
            # Calculate inference time
            inference_time = (time.time() - start_time) * 1000
            print(f"Inference time: {inference_time:.2f}ms")
            
            # Convert processed frame to base64 for WebSocket
            base64_frame = frame_to_base64(processed_frame)
            
            # Send the processed frame to connected clients
            socketio.emit('detection_update', {'frame': base64_frame, 'detections': detections})
            
            # Small delay to avoid overwhelming the system
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

# Configure Gemini API
def configure_gemini_api():
    """Configure Gemini API with API key from environment variables"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found in environment variables")
        return False
    
    genai.configure(api_key=api_key)
    return True

# Initialize Gemini when app starts
gemini_configured = configure_gemini_api()

@app.route('/api/activity/analyze', methods=['GET'])
def analyze_activity():
    """
    Analyze recent MediaPipe data using Gemini AI to determine user activity
    Returns a natural language description of what the user is doing
    """
    try:
        if not gemini_configured:
            return jsonify({
                "success": False, 
                "error": "Gemini API not configured, please set GEMINI_API_KEY"
            }), 500
        
        # Get data from the last 15 seconds
        time_window = int(request.args.get('time_window', 15))  # Default 15 seconds
        end_time = datetime.now()
        start_time = end_time - timedelta(seconds=time_window)
        
        # Get recent recognition data from Supabase
        data = get_recent_recognition_data(start_time)
        
        if not data["success"]:
            return jsonify(data), 500
        
        if not data["data"] or len(data["data"]) == 0:
            return jsonify({
                "success": True,
                "activity": "No activity data available in the specified time window."
            }), 200
        
        # Process the data for Gemini
        prompt = create_gemini_prompt(data["data"])
        
        # Call Gemini API for interpretation
        activity_description = call_gemini_api(prompt)
        
        return jsonify({
            "success": True,
            "activity": activity_description,
            "timestamp": end_time.isoformat()
        }), 200
    
    except Exception as e:
        print(f"Error analyzing activity: {e}")
        return jsonify({
            "success": False, 
            "error": str(e)
        }), 500

def get_recent_recognition_data(start_time):
    """
    Get recognition data from Supabase since the given start time
    
    Args:
        start_time (datetime): Start time for data retrieval
    
    Returns:
        dict: Recognition data from all types (Face, Pose, Gesture)
    """
    try:
        client = get_client()
        
        # Query all recognition data after the start time
        query = client.table("recognition_logs") \
                .select("*") \
                .gte("created_at", start_time.isoformat()) \
                .order("created_at", desc=False)
        
        response = query.execute()
        
        # Extract and process the data
        processed_data = {
            "Face": [],
            "Pose": [],
            "Gesture": []
        }
        
        for record in response.data:
            log_type = record["type_recognition"]
            log_info = json.loads(record["log_info"])
            
            # Add the record to the appropriate category
            if log_type in processed_data:
                processed_data[log_type].append({
                    "timestamp": record["created_at"],
                    "data": log_info
                })
        
        return {"success": True, "data": processed_data}
    
    except Exception as e:
        print(f"Error getting recent recognition data: {e}")
        return {"success": False, "error": str(e)}

def create_gemini_prompt(recognition_data):
    """
    Create a prompt for Gemini based on the recognition data
    
    Args:
        recognition_data (dict): Dictionary containing Face, Pose, and Gesture data
    
    Returns:
        str: Formatted prompt for Gemini
    """
    prompt = """# HUMAN ACTIVITY ANALYSIS TASK

You are an expert computer vision analyst specializing in human behavior interpretation. You have access to MediaPipe recognition data that captures facial expressions, body posture, and hand gestures in real time.

## YOUR TASK
Analyze the following multimodal data carefully and provide a precise, insightful description of what the person is doing. 

## DATA ANALYSIS INSTRUCTIONS
1. Examine each data point carefully and consider how facial expressions, body posture, and hand gestures work together
2. Pay special attention to patterns that indicate specific activities (e.g., typing, reading, explaining something)
3. Consider emotional states suggested by facial expressions
4. Consider physical positioning suggested by posture metrics
5. Consider intentions suggested by hand gestures
6. Look for correlations between all data points to form a coherent interpretation

## COMPUTER VISION DATA:
"""
    
    # Add face data with enhanced detail
    if recognition_data["Face"]:
        prompt += "\n### FACIAL EXPRESSION ANALYSIS:\n"
        # Take the most recent face data
        face_data = recognition_data["Face"][-1]["data"]
        if "faceBlendshapes" in face_data and face_data["faceBlendshapes"] and len(face_data["faceBlendshapes"]) > 0:
            blendshapes = face_data["faceBlendshapes"][0]["categories"]
            # Sort by score and take top 8 for more comprehensive analysis
            significant_expressions = sorted(blendshapes, key=lambda x: x["score"], reverse=True)[:8]
            prompt += "Primary facial expressions (in order of intensity):\n"
            for exp in significant_expressions:
                prompt += f"- {exp['categoryName']}: {exp['score']:.4f}\n"
            
            # Add interpretative guidance for emotions
            prompt += "\nEmotional indicators:\n"
            
            # Check for specific emotional cues
            smile_score = next((x["score"] for x in blendshapes if x["categoryName"] == "smileLeft" or x["categoryName"] == "smileRight"), 0)
            frown_score = next((x["score"] for x in blendshapes if x["categoryName"] == "browDownLeft" or x["categoryName"] == "browDownRight"), 0)
            surprise_score = next((x["score"] for x in blendshapes if x["categoryName"] == "eyeWideLeft" or x["categoryName"] == "eyeWideRight"), 0)
            
            if smile_score > 0.3:
                prompt += "- Appears to be smiling or expressing positive emotion\n"
            if frown_score > 0.3:
                prompt += "- Shows signs of concentration or concern\n"
            if surprise_score > 0.3:
                prompt += "- Displays surprise or heightened attention\n"
    
    # Add pose data with enhanced biomechanical interpretation
    if recognition_data["Pose"]:
        prompt += "\n### BODY POSTURE ANALYSIS:\n"
        # Take the most recent pose data
        pose_data = recognition_data["Pose"][-1]["data"]
        if "poseMetrics" in pose_data and pose_data["poseMetrics"]:
            pose_metrics = pose_data["poseMetrics"]
            prompt += "Key posture metrics:\n"
            for metric in pose_metrics:
                prompt += f"- {metric['displayName']}: {metric['value']:.2f}\n"
            
            # Add interpretative guidance for posture
            prompt += "\nPosture indicators:\n"
            
            # Check for specific posture indicators
            spine_alignment = next((x["value"] for x in pose_metrics if "spine" in x["name"].lower()), 0)
            shoulder_alignment = next((x["value"] for x in pose_metrics if "shoulder" in x["name"].lower()), 0)
            
            if spine_alignment > 0.7:
                prompt += "- Upright posture, likely engaged and attentive\n"
            elif spine_alignment < 0.4:
                prompt += "- Slouched or leaning posture, possibly relaxed or fatigued\n"
                
            if shoulder_alignment > 0.7:
                prompt += "- Shoulders level and balanced, indicating proper posture\n"
            elif shoulder_alignment < 0.4:
                prompt += "- Shoulders uneven, possibly reaching for something or in asymmetric position\n"
    
    # Add gesture data with enhanced semantic interpretation
    if recognition_data["Gesture"]:
        prompt += "\n### HAND GESTURE ANALYSIS:\n"
        # Take the most recent gesture data
        gesture_data = recognition_data["Gesture"][-1]["data"]
        if "detectedGestures" in gesture_data and gesture_data["detectedGestures"]:
            prompt += "Detected gestures:\n"
            for hand_gesture in gesture_data["detectedGestures"]:
                hand = hand_gesture["hand"]
                gestures = hand_gesture["gestures"]
                prompt += f"- {hand} hand: " + ", ".join([f"{g['categoryName']} ({g['score']:.2f})" for g in gestures]) + "\n"
            
            # Add interpretative guidance for common gestures
            prompt += "\nGesture indicators:\n"
            
            # Extract highest confidence gestures for each hand
            left_gestures = []
            right_gestures = []
            for hand_gesture in gesture_data["detectedGestures"]:
                if hand_gesture["hand"] == "Left" and hand_gesture["gestures"]:
                    left_gestures = [g["categoryName"].lower() for g in hand_gesture["gestures"]]
                elif hand_gesture["hand"] == "Right" and hand_gesture["gestures"]:
                    right_gestures = [g["categoryName"].lower() for g in hand_gesture["gestures"]]
            
            # Interpret common gesture combinations
            if "thumb_up" in left_gestures or "thumb_up" in right_gestures:
                prompt += "- Thumbs up gesture suggests approval or confirmation\n"
            if "pointing_up" in left_gestures or "pointing_up" in right_gestures:
                prompt += "- Pointing gesture may indicate explanation or direction\n"
            if "open_palm" in left_gestures or "open_palm" in right_gestures:
                prompt += "- Open palm suggests openness or presenting information\n"
            if "closed_fist" in left_gestures or "closed_fist" in right_gestures:
                prompt += "- Closed fist may indicate emphasis or determination\n"
    
    # Add comprehensive instructions for the final output
    prompt += """
## REASONING AND INTERPRETATION
Based on the multimodal data above:

1. What facial expressions are dominant and what do they suggest?
2. What does the body posture indicate about the person's current activity?
3. What do the hand gestures reveal about the person's intentions or actions?
4. How do these elements combine to indicate a specific activity?

## OUTPUT FORMAT
Provide your analysis in two parts:

1 - DETAILED REASONING: Briefly explain your interpretation of the key indicators across facial expressions, posture, and gestures.
2 - ACTIVITY DESCRIPTION: Write a natural, conversational 1-2 sentence description of what the person is doing, including both physical actions and possible intentions or emotional states.

Your description should be precise, insightful, and capture the nuance of human behavior based on this multimodal data.
"""
    
    return prompt

def call_gemini_api(prompt):
    """
    Call Gemini API with the given prompt
    
    Args:
        prompt (str): The prompt to send to Gemini
    
    Returns:
        str: Gemini's response
    """
    try:
        # First, list available models to find the correct one
        available_models = genai.list_models()
        #print("Available Gemini models:")
        gemini_models = []
        
        for model in available_models:
            model_name = model.name
            # Comment out the model listing to reduce clutter
            #print(f"- {model_name}")
            if "gemini" in model_name.lower():
                gemini_models.append(model_name)
        
        # Choose the most capable model available
        model_name = None
        preferred_models = [
            # Based on actual available models in your account (from latest to oldest)
            "models/gemini-2.5-pro-exp-03-25",  # Experimental 2.5 Pro model - newest and most capable
            "models/gemini-2.0-pro-exp",        # Experimental 2.0 Pro model
            "models/gemini-1.5-pro",            # Stable 1.5 Pro model
            "models/gemini-1.5-pro-002",        # Specific version of 1.5 Pro
            "models/gemini-1.5-pro-001",        # Specific version of 1.5 Pro
            "models/gemini-1.5-flash",          # 1.5 Flash model (faster but less capable than Pro)
            "models/gemini-pro-vision",         # Vision model (backup option)
        ]
        
        for preferred in preferred_models:
            for available in gemini_models:
                if preferred in available:
                    model_name = available
                    break
            if model_name:
                break
        
        # If no Gemini models found, use the first available model
        if not model_name and gemini_models:
            model_name = gemini_models[0]
        elif not model_name and available_models:
            model_name = available_models[0].name
        else:
            # Fallback to the common stable model
            model_name = "models/gemini-1.5-pro"
        
        #print(f"Using model: {model_name}")
        
        # Use the selected model
        model = genai.GenerativeModel(model_name)
        
        # Call the API with safety settings
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "max_output_tokens": 250,  # Increased output length for better analysis
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
            ]
        )
        
        # Extract and return the text
        return response.text
    
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return f"Could not analyze activity: {str(e)}"

@app.route('/api/chat/kindergarten-teacher', methods=['POST'])
def kindergarten_teacher_chat():
    """
    Provide child-friendly responses using Gemini AI with a kindergarten teacher persona.
    This endpoint creates nurturing, educational responses focused on environmental
    awareness and emotional support.
    
    Expected JSON input:
    {
        "message": "User's message text",
        "activity_data": "Recent activity insight (optional)",
        "emotion_data": "Detected emotion (optional)"
    }
    """
    try:
        if not gemini_configured:
            return jsonify({
                "success": False, 
                "error": "Gemini API not configured, please set GEMINI_API_KEY"
            }), 500
        
        # Extract data from request
        data = request.json
        if not data or 'message' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required field: message"
            }), 400
            
        user_message = data['message']
        activity_data = data.get('activity_data', 'No recent activity data available.')
        emotion_data = data.get('emotion_data', 'Unknown')
        
        # Create prompt for kindergarten teacher persona
        prompt = create_kindergarten_teacher_prompt(user_message, activity_data, emotion_data)
        
        # Call Gemini API with the teacher persona prompt
        response = call_kindergarten_teacher_gemini(prompt)
        
        return jsonify({
            "success": True,
            "response": response
        }), 200
        
    except Exception as e:
        print(f"Error in kindergarten teacher chat: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def create_kindergarten_teacher_prompt(user_message, activity_data, emotion_data):
    """
    Create a prompt for Gemini that instructs it to respond as a nurturing
    kindergarten teacher who is emotionally supportive and educates about
    environmental awareness.
    
    Args:
        user_message (str): The message from the user (child)
        activity_data (str): Description of the user's recent activity
        emotion_data (str): Detected emotional state
        
    Returns:
        str: Formatted prompt for Gemini
    """
    prompt = """# KINDERGARTEN TEACHER AI ASSISTANT

## YOUR ROLE
You are a warm, nurturing kindergarten teacher speaking to a young child. Your response should be emotionally supportive, educational, and appropriate for young children. You should convey a sense of care and encouragement while gently teaching about environmental consciousness and trash classification.

## YOUR PERSONALITY
- Use endearing terms like "sweetheart," "little one," or "dear"
- Speak with gentle enthusiasm and warmth
- Be encouraging and positive
- Express genuine care for the child's feelings
- Use simple language a young child would understand
- Be patient and supportive
- Include occasional gentle questions to engage the child

## EDUCATIONAL FOCUS
- Environmental awareness
- Proper trash classification (plastic, paper, metal, glass)
- Recycling importance
- Caring for our planet
- Simple sustainability concepts

## INFORMATION ABOUT THE CHILD

The child's recent activity: {activity}

The child's current emotional state appears to be: {emotion}

## THE CHILD'S MESSAGE
"{message}"

## YOUR RESPONSE GUIDELINES
1. First, acknowledge the child's emotions if relevant
2. Address their question or comment directly
3. Include a gentle educational element about environmental awareness when appropriate
4. End with encouragement or a supportive comment
5. Keep your response brief (2-4 short sentences) and use simple language
6. Be warm and nurturing throughout

Please respond as this kindergarten teacher would, with warmth, care, and gentle environmental education.
"""
    
    # Replace placeholders with actual data
    prompt = prompt.replace("{message}", user_message)
    prompt = prompt.replace("{activity}", activity_data)
    prompt = prompt.replace("{emotion}", emotion_data)
    
    return prompt

def call_kindergarten_teacher_gemini(prompt):
    """
    Call Gemini API with the kindergarten teacher prompt
    
    Args:
        prompt (str): The prompt with kindergarten teacher instructions
        
    Returns:
        str: Gemini's child-friendly response
    """
    try:
        # Set a second API key if provided (allowing different APIs for different purposes)
        second_api_key = os.getenv("GEMINI_API_KEY_SECONDARY")
        api_key = second_api_key if second_api_key else os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            raise ValueError("No Gemini API key available")
        
        # Configure genai with the API key for this request
        genai.configure(api_key=api_key)
        
        # Use the preferred model for this assistant
        model_name = "models/gemini-1.5-pro" # Default to a stable model for consistent responses
        
        # Use the best available model if you prefer
        available_models = genai.list_models()
        gemini_models = [model.name for model in available_models if "gemini" in model.name.lower()]
        
        if gemini_models:
            # Preferred models for the kindergarten teacher (prioritizing stable models)
            preferred_models = [
                "models/gemini-1.5-pro",
                "models/gemini-1.5-flash",
                "models/gemini-pro",
                "models/gemini-pro-vision"
            ]
            
            for preferred in preferred_models:
                matching_models = [m for m in gemini_models if preferred in m]
                if matching_models:
                    model_name = matching_models[0]
                    break
        
        #print(f"Using model for kindergarten teacher: {model_name}")
        
        # Initialize the model
        model = genai.GenerativeModel(model_name)
        
        # Call the API with specific settings for the kindergarten teacher
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.8,  # Slightly higher temperature for more warmth and personality
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 200,  # Keep responses relatively concise for a child
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
            ]
        )
        
        # Extract and return the text
        return response.text.strip()
    
    except Exception as e:
        print(f"Error calling Gemini API for kindergarten teacher response: {e}")
        return "I'm sorry, sweetheart. I'm having a little trouble with my thinking right now. Can we try talking again in a moment?"

# LiveKit token endpoint
@app.route('/api/livekit/token', methods=['GET', 'OPTIONS'])
def get_livekit_token():
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        print("LiveKit token endpoint called")
        user_id = request.args.get('user_id', 'user-' + str(int(time.time())))
        room_name = request.args.get('room', 'ai-assistant-room')
        
        print(f"Generating tokens for user_id: {user_id}, room: {room_name}")
        
        # Get tokens for both AI and user
        token_data = livekit_service.get_ai_and_user_tokens(room_name, user_id)
        
        print(f"Generated tokens successfully: {token_data.keys()}")
        
        response = jsonify(token_data)
        # Add CORS headers explicitly
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        print(f"Error generating LiveKit tokens: {str(e)}")
        error_response = jsonify({"error": str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

# Voice chat endpoint
@app.route('/api/voice-chat', methods=['POST'])
def voice_chat():
    data = request.json
    
    if not data or 'message' not in data:
        return jsonify({'error': 'Missing message in request'}), 400
    
    user_message = data.get('message', '')
    emotion = data.get('emotion', None)
    activity = data.get('activity', None)
    
    try:
        # Generate AI response
        context = ""
        if emotion:
            context += f"The user appears to be feeling {emotion}. "
        if activity:
            context += f"The user has been {activity}. "
        
        prompt = f"""You are a friendly kindergarten teacher AI assistant talking to a child.
        {context}
        The child says: "{user_message}"
        
        Respond in a warm, nurturing voice that's appropriate for young children.
        Keep your response brief and easy to understand, focusing on environmental education.
        """
        
        # Set a second API key if provided (allowing different APIs for different purposes)
        second_api_key = os.getenv("GEMINI_API_KEY_SECONDARY")
        api_key = second_api_key if second_api_key else os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            raise ValueError("No Gemini API key available")
        
        # Configure genai with the API key for this request
        genai.configure(api_key=api_key)
        
        # Use reliable model
        gemini = genai.GenerativeModel('gemini-1.5-pro')
        
        response = gemini.generate_content(
            prompt,
            generation_config={
                "temperature": 0.8,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 200,
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
            ]
        )
        
        ai_response = response.text
        
        return jsonify({
            'response': ai_response,
            'success': True
        })
        
    except Exception as e:
        print(f"Error generating voice response: {str(e)}")
        return jsonify({
            'response': "I'm sorry, sweetheart. I'm having trouble understanding right now. Can you try saying that again?",
            'success': False,
            'error': str(e)
        }), 500

# Add a simple test endpoint
@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint that returns JSON"""
    response = jsonify({"status": "ok", "message": "Backend API is working properly"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

if __name__ == '__main__':
    print("Starting Trash Detection Backend on port 8000...")
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)