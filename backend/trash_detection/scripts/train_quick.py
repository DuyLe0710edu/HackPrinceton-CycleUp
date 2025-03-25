#!/usr/bin/env python3
"""
Quick training script for trash detection model with small batch size.
Optimized for a 20-minute training window.
"""
import os
import sys
from ultralytics import YOLO

def main():
    print("Starting quick training for trash detection model...")
    
    # Get the absolute path to the data.yaml file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.abspath(os.path.join(script_dir, '../../'))
    data_yaml_path = os.path.join(project_dir, 'trash_detection', 'data', 'data.yaml')
    
    # Check if the data.yaml file exists
    if not os.path.exists(data_yaml_path):
        print(f"ERROR: Data file not found at {data_yaml_path}")
        print("Please make sure you have created a data.yaml file with your dataset configuration.")
        return
    
    print(f"Using data configuration from: {data_yaml_path}")
    
    # Load a pre-trained YOLOv8 nano model for faster training
    model = YOLO('yolov8n.pt')
    
    # Define training configuration optimized for speed
    results = model.train(
        data=data_yaml_path,
        epochs=15,           # Small number of epochs for quick training
        imgsz=416,           # Smaller image size for faster processing
        batch=8,             # Small batch size as requested
        patience=5,          # Early stopping if model doesn't improve after 5 epochs
        save=True,           # Save the trained model
        device='0' if os.environ.get("CUDA_VISIBLE_DEVICES") else 'cpu',
        project=os.path.join(project_dir, 'trash_detection', 'runs'),
        name='trash_detection',
        exist_ok=True,       # Overwrite existing results
        pretrained=True,     # Use pre-trained weights for transfer learning
        optimizer='Adam',    # Adam optimizer for faster convergence
        lr0=0.001,           # Higher learning rate for faster training
        cos_lr=True,         # Cosine learning rate schedule
        verbose=True         # Show detailed training information
    )
    
    print(f"Training completed. Model saved to {results.save_dir}")

if __name__ == "__main__":
    main() 