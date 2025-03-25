#!/usr/bin/env python3
"""
Fine-tune YOLOv8 model on trash detection dataset.
"""
import os
from ultralytics import YOLO

def main():
    print("Starting training for trash detection...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_yaml_path = os.path.abspath(os.path.join(script_dir, '../data/data.yaml'))
    
    print(f"Using data configuration from: {data_yaml_path}")
    
    # Verify the file exists
    if not os.path.exists(data_yaml_path):
        print(f"ERROR: Data file not found at {data_yaml_path}")
        print("Current working directory:", os.getcwd())
        return
    
    # Load a pre-trained YOLOv8 model
    model = YOLO('yolov8n.pt') 
    model = YOLO('yolov8s.pt')  # use yolov8s.pt for better results
    
    # Define training configuration
    results = model.train(
        data=data_yaml_path,
        epochs=100,
        imgsz=640,
        batch=16,
        patience=20,
        save=True,
        device='0' if os.environ.get("CUDA_VISIBLE_DEVICES") else 'cpu',
        project='../runs',
        name='trash_detection'
    )
    
    print(f"Training completed. Model saved to {results.save_dir}")

if __name__ == "__main__":
    main()
