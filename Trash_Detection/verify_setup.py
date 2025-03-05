#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Verify that the environment is correctly set up for trash detection.
"""

import os
import sys
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

def main():
    print("Verification of setup:")
    print(f"Python version: {sys.version}")
    print(f"TensorFlow version: {tf.__version__}")
    print(f"Numpy version: {np.__version__}")
    
    # Check if TensorFlow can access GPU
    print("\nGPU available:", tf.test.is_gpu_available())
    
    # Check if the directory structure is correct
    root_dir = os.path.abspath(".")
    print(f"\nRoot directory: {root_dir}")
    
    required_dirs = [
        "mrcnn",
        "trash",
        "weights"
    ]
    
    print("\nChecking required directories:")
    for d in required_dirs:
        path = os.path.join(root_dir, d)
        exists = os.path.exists(path)
        print(f"  - {d}: {'✓' if exists else '✗'}")
        
        if d == "weights" and not exists:
            print("    Creating weights directory...")
            os.makedirs(path)
    
    # Check for required files
    print("\nChecking for model weights:")
    weights_path = os.path.join(root_dir, "weights", "mask_rcnn_trash_0200_030519_large.h5")
    coco_weights_path = os.path.join(root_dir, "weights", "mask_rcnn_coco.h5")
    
    weights_exist = os.path.exists(weights_path)
    coco_weights_exist = os.path.exists(coco_weights_path)
    
    print(f"  - COCO weights: {'✓' if coco_weights_exist else '✗'}")
    print(f"  - Trash model weights: {'✓' if weights_exist else '✗'}")
    
    if not weights_exist or not coco_weights_exist:
        print("\nSome weights are missing. Run download_weights.py to download COCO weights.")
        print("For trash-specific weights, you'll need to either:")
        print("  1. Train the model yourself, or")
        print("  2. Manually place pre-trained weights in the weights directory")
    
    print("\nSetup verification complete. If any issues were found, please resolve them before running the model.")

if __name__ == "__main__":
    main() 