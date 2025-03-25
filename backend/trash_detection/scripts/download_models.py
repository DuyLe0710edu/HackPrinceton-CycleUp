#!/usr/bin/env python3
"""
Download YOLOv8 models for trash detection project.
"""
import os
from ultralytics import YOLO

def main():
    print("Downloading YOLOv8 models...")
    
    # Create models directory if it doesn't exist
    os.makedirs("../models", exist_ok=True)
    
    # Download YOLOv8n model (small)
    model_n = YOLO("yolov8n.pt")
    print(f"Downloaded YOLOv8n model")
    
    # Download YOLOv8s model (medium)
    model_s = YOLO("yolov8s.pt")
    print(f"Downloaded YOLOv8s model")
    
    print("Models downloaded successfully!")
    print("Next steps:")
    print("1. Organize your trash images dataset")
    print("2. Train the model using train.py")
    print("3. Run inference using detect.py")

if __name__ == "__main__":
    main()
