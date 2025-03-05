#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Simple script to run trash detection.
"""

import os
import sys
import subprocess
import glob

def main():
    print("=" * 50)
    print("Trash Detection Runner")
    print("=" * 50)
    
    # Check for weights directory
    weights_dir = "weights"
    if not os.path.exists(weights_dir):
        print(f"Creating {weights_dir} directory...")
        os.makedirs(weights_dir)
        
    # Check for weights file
    weights_file = os.path.join(weights_dir, "mask_rcnn_trash_0200_030519_large.h5")
    if not os.path.exists(weights_file):
        print("\nWARNING: Trash weights file not found!")
        print(f"Expected location: {weights_file}")
        print("\nPlease download the weights file from:")
        print("https://drive.google.com/drive/folders/1-ii6dHK3mUSY1mKfdYPPNZ18S7fEkl_o?usp=sharing")
        print("and place it in the weights directory.")
        
        response = input("\nDo you want to continue without the weights file? (y/n): ")
        if response.lower() != 'y':
            print("Exiting. Please download the weights file and try again.")
            sys.exit(0)
    else:
        print(f"Weights file found: {weights_file}")
    
    # Check for images directory
    images_dir = "images"
    if not os.path.exists(images_dir):
        print(f"\nCreating {images_dir} directory...")
        os.makedirs(images_dir)
        print(f"Please add some images to the {images_dir} directory.")
        
        response = input("\nNo images found. Do you want to continue? (y/n): ")
        if response.lower() != 'y':
            print("Exiting. Please add some images and try again.")
            sys.exit(0)
    else:
        # Check for images
        image_files = []
        for ext in ["*.jpg", "*.jpeg", "*.png"]:
            image_files.extend(glob.glob(os.path.join(images_dir, ext)))
        
        if not image_files:
            print(f"\nWARNING: No images found in the {images_dir} directory!")
            print("Please add some .jpg, .jpeg, or .png files.")
            
            response = input("\nDo you want to continue without any images? (y/n): ")
            if response.lower() != 'y':
                print("Exiting. Please add some images and try again.")
                sys.exit(0)
        else:
            print(f"\nFound {len(image_files)} images for detection.")
    
    # Check for results directory
    results_dir = "results"
    if not os.path.exists(results_dir):
        print(f"\nCreating {results_dir} directory...")
        os.makedirs(results_dir)
    
    # Run the detection script
    print("\n" + "="*50)
    print("Running trash detection...")
    print("="*50)
    
    try:
        # Run with the Agg backend to avoid Tkinter issues
        process = subprocess.run(
            ["python", "Detect_trash_on_images.py"],
            check=True,
            env={**os.environ, "MPLBACKEND": "Agg"}
        )
        
        if process.returncode == 0:
            print("\n" + "="*50)
            print("Trash detection completed successfully!")
            print(f"Results are saved in the {results_dir} directory.")
            print("="*50)
        else:
            print("\nERROR: Detection process failed.")
    except subprocess.CalledProcessError as e:
        print(f"\nERROR: Detection process failed with return code {e.returncode}")
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Exiting.")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
    
if __name__ == "__main__":
    main() 