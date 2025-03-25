#!/usr/bin/env python3
"""
Run inference with YOLOv8 on images for trash detection.
"""
import os
import argparse
from ultralytics import YOLO
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description='Run YOLOv8 inference on images')
    parser.add_argument('--source', type=str, default='../data/images', 
                        help='source image or directory')
    parser.add_argument('--model', type=str, default='../models/yolov8n.pt',
                        help='model path or name')
    parser.add_argument('--conf', type=float, default=0.25,
                        help='confidence threshold')
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Load the model
    model = YOLO(args.model)
    
    # Run inference
    results = model(args.source, conf=args.conf, save=True)
    
    print(f"Detection completed. Results saved to {Path(args.source).parent / 'runs/detect'}")

if __name__ == "__main__":
    main()
