#!/usr/bin/env python3
"""
Camera testing utility for Trash Detection app
This script tests camera access and can help diagnose camera issues
"""
import cv2
import time
import os
import sys
import base64
import datetime

def test_camera_access(camera_idx=0, test_frames=20):
    """Test if we can access the camera and get frames"""
    print(f"Testing camera at index {camera_idx}...")
    
    # Try to open the camera
    cap = cv2.VideoCapture(camera_idx)
    if not cap.isOpened():
        print(f"❌ Failed to open camera at index {camera_idx}")
        return False
    
    print(f"✅ Camera at index {camera_idx} opened successfully")
    
    # Try to read frames
    success_count = 0
    for i in range(test_frames):
        ret, frame = cap.read()
        if ret:
            success_count += 1
            if i == 0:
                # Save the first frame as proof
                timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
                filename = f"camera_test_{timestamp}.jpg"
                cv2.imwrite(filename, frame)
                print(f"✅ First frame saved to {filename}")
        else:
            print(f"❌ Frame read {i+1}/{test_frames} failed")
        time.sleep(0.1)
    
    # Release the camera
    cap.release()
    
    print(f"✅ Successfully read {success_count}/{test_frames} frames")
    return success_count > 0

def test_mjpg_camera():
    """Test camera with MJPG format"""
    print("Testing camera with MJPG format...")
    
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    if not cap.isOpened():
        print("❌ Failed to open camera with MJPG format")
        return False
    
    ret, frame = cap.read()
    if ret:
        timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        filename = f"camera_test_mjpg_{timestamp}.jpg"
        cv2.imwrite(filename, frame)
        print(f"✅ MJPG frame saved to {filename}")
        success = True
    else:
        print("❌ Failed to read MJPG frame")
        success = False
    
    cap.release()
    return success

def list_available_cameras(max_cameras=10):
    """List all available cameras by trying to open them"""
    print(f"Checking for available cameras (up to {max_cameras})...")
    available_cameras = []
    
    for i in range(max_cameras):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            # Get camera details
            width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Try to get a frame
            ret, frame = cap.read()
            frame_status = "✅" if ret else "❌"
            
            print(f"Camera {i}: {frame_status} {width}x{height} @ {fps}fps")
            available_cameras.append(i)
            
            cap.release()
        else:
            cap.release()
    
    if not available_cameras:
        print("❌ No cameras found!")
    else:
        print(f"✅ Found {len(available_cameras)} camera(s): {available_cameras}")
    
    return available_cameras

if __name__ == "__main__":
    print("🎥 Camera Test Utility for Trash Detection App 🎥")
    print("===============================================")
    
    # Check OpenCV version
    print(f"OpenCV Version: {cv2.__version__}")
    
    # Check OS
    print(f"Operating System: {sys.platform}")
    
    # List available cameras
    cameras = list_available_cameras()
    #Checking what is the camera 
    
    if cameras:
        # Test the default camera (index 0)
        test_camera_access(0)
        
        # Test MJPG format
        test_mjpg_camera()
        
        print("\n✅ Camera testing complete. Check the saved images to verify camera access.")
        print("If you're still having issues with the main app, try:")
        print("1. Check camera permissions for your terminal/IDE")
        print("2. Restart your computer")
        print("3. Try running the app with sudo (for system level permissions)")
    else:
        print("\n❌ No cameras detected. Troubleshooting steps:")
        print("1. Check if your camera is connected properly")
        print("2. Check if your camera is being used by another application")
        print("3. Try restarting your computer")
        print("4. On macOS, ensure Terminal/your IDE has camera permissions in System Preferences") 