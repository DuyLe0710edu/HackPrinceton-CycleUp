#!/usr/bin/env python
# coding: utf-8

# Mask R-CNN - Visualize Trash detection

import os
import sys
import random
import math
import re
import time
import glob
import numpy as np
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Check for required packages and install if missing
required_packages = {
    "tensorflow": "tensorflow",
    "matplotlib": "matplotlib",
    "skimage": "scikit-image"
}

for module, package in required_packages.items():
    try:
        __import__(module)
    except ImportError:
        print(f"Installing {package}...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

import tensorflow as tf
import matplotlib
# Use Agg backend instead of TkAgg (doesn't require _tkinter)
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import skimage.io

# Add this right after the imports at the top of the file
# Apply compatibility patches for Keras in TensorFlow 2.x
try:
    from compatibility import *
    print("Keras compatibility module loaded successfully.")
except ImportError:
    print("WARNING: Could not import compatibility module. Falling back to direct imports.")

# Fix for keras.engine import in TensorFlow 2.x
try:
    import keras.engine
except ImportError:
    print("Patching keras.engine imports for TensorFlow 2.x compatibility...")
    import tensorflow as tf
    import tensorflow.keras as keras
    import sys
    
    # Create a compatibility layer for keras.engine
    if not hasattr(sys.modules, 'keras.engine'):
        sys.modules['keras.engine'] = tf.keras.engine
        
    # Also add compatibility for keras.layers and other common modules
    if not hasattr(sys.modules, 'keras.layers'):
        sys.modules['keras.layers'] = tf.keras.layers
    if not hasattr(sys.modules, 'keras.models'):
        sys.modules['keras.models'] = tf.keras.models
    if not hasattr(sys.modules, 'keras.utils'):
        sys.modules['keras.utils'] = tf.keras.utils
    if not hasattr(sys.modules, 'keras.backend'):
        sys.modules['keras.backend'] = tf.keras.backend
    
    print("Keras compatibility patching complete.")

# Root directory of the project
ROOT_DIR = os.getcwd()
print(f"Root directory: {ROOT_DIR}")

# Import Mask RCNN
sys.path.append(ROOT_DIR)  # To find local version of the library
try:
    from mrcnn import utils
    from mrcnn import visualize
    from mrcnn.visualize import display_images
    import mrcnn.model as modellib
    from mrcnn.model import log
    from trash import trash
except ImportError as e:
    print(f"ERROR: Could not import Mask R-CNN modules: {e}")
    print("Make sure you're in the correct directory and all files are present.")
    sys.exit(1)

# Directory to save logs and trained model
MODEL_DIR = os.path.join(ROOT_DIR, "logs")

# Create logs directory if it doesn't exist
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

# Path to Trash trained weights
TRASH_WEIGHTS_PATH = os.path.join(ROOT_DIR, "weights", "mask_rcnn_trash_0200_030519_large.h5")

print('Weights path: ', TRASH_WEIGHTS_PATH)

# Configurations
try:
    config = trash.TrashConfig()
    TRASH_DIR = 'trash'
    print(f"Trash directory: {TRASH_DIR}")

    # Override the training configurations with a few changes for inferencing
    class InferenceConfig(config.__class__):
        # Run detection on one image at a time
        GPU_COUNT = 1
        IMAGES_PER_GPU = 1

    config = InferenceConfig()
    print("Configuration:")
    config.display()
except Exception as e:
    print(f"ERROR: Failed to load configuration: {e}")
    sys.exit(1)

# Device to load the neural network on.
# Useful if you're training a model on the same 
# machine, in which case use CPU and leave the
# GPU for training.
DEVICE = "/cpu:0"  # /cpu:0 or /gpu:0

# Inspect the model in training or inference modes
# values: 'inference' or 'training'
# TODO: code for 'training' test mode not ready yet
TEST_MODE = "inference"

def get_ax(rows=1, cols=1, size=16):
    """Return a Matplotlib Axes array to be used in
    all visualizations in the notebook. Provide a
    central point to control graph sizes.
    
    Adjust the size attribute to control how big to render images
    """
    _, ax = plt.subplots(rows, cols, figsize=(size*cols, size*rows))
    return ax

# Load validation dataset
try:
    dataset = trash.TrashDataset()
    dataset.load_trash(TRASH_DIR, "val")

    # Must call before using the dataset
    dataset.prepare()

    print("Images: {}\nClasses: {}".format(len(dataset.image_ids), dataset.class_names))
except Exception as e:
    print(f"WARNING: Could not load validation dataset: {e}")
    print("This is not critical, continuing...")

# Create model in inference mode
try:
    with tf.device(DEVICE):
        model = modellib.MaskRCNN(mode="inference", model_dir=MODEL_DIR, config=config)
except Exception as e:
    print(f"ERROR: Failed to create the model: {e}")
    sys.exit(1)

# Check if weights directory exists, create if not
weights_dir = os.path.dirname(TRASH_WEIGHTS_PATH)
if not os.path.exists(weights_dir) and weights_dir:
    os.makedirs(weights_dir)
    print(f"Created weights directory: {weights_dir}")

# Check if weights file exists
if not os.path.exists(TRASH_WEIGHTS_PATH):
    print(f"\nWARNING: Weights file not found at {TRASH_WEIGHTS_PATH}")
    print("Checking in alternative locations...")
    
    # Try alternative locations
    alt_paths = [
        "weights/mask_rcnn_trash_0200_030519_large.h5",
        "../weights/mask_rcnn_trash_0200_030519_large.h5",
        os.path.join(os.path.dirname(ROOT_DIR), "weights", "mask_rcnn_trash_0200_030519_large.h5")
    ]
    
    for path in alt_paths:
        if os.path.exists(path):
            print(f"Found weights at {path}")
            TRASH_WEIGHTS_PATH = path
            break
    else:
        print("\nERROR: Could not find weights file.")
        sys.exit(1)

# Load the weights
try:
    print(f"Loading weights from: {TRASH_WEIGHTS_PATH}")
    model.load_weights(TRASH_WEIGHTS_PATH, by_name=True)
    print("Weights loaded successfully!")
except Exception as e:
    print(f"ERROR: Failed to load weights: {e}")
    sys.exit(1)

# Check for the images directory, create if it doesn't exist
images_dir = "images"
if not os.path.exists(images_dir):
    os.makedirs(images_dir)
    print(f"Created {images_dir} directory. Please add some images.")

# Get images from the directory of all the test images
image_files = []
for ext in ["*.jpg", "*.jpeg", "*.png"]:
    image_files.extend(glob.glob(os.path.join(images_dir, ext)))

print(f"Found {len(image_files)} images for detection.")

if not image_files:
    print("No images found in the 'images' directory.")
    print("Please add some .jpg, .jpeg, or .png files and run again.")
    sys.exit(0)

# Create results directory
output_dir = "results"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)
    print(f"Created results directory: {output_dir}")

# Run detection on images
print("\nStarting detection on images...")
successful_detections = 0

for image_path in image_files:
    try:
        print(f"\nProcessing image: {os.path.basename(image_path)}")
        
        # Load the image
        try:
            image = skimage.io.imread(image_path)
            if image.ndim != 3 or image.shape[2] != 3:
                print(f"WARNING: Image {image_path} is not a proper RGB image. Skipping.")
                continue
        except Exception as e:
            print(f"ERROR: Could not load image {image_path}: {e}")
            continue
            
        # Run object detection
        try:
            results = model.detect([image], verbose=1)
        except Exception as e:
            print(f"ERROR: Detection failed for {image_path}: {e}")
            continue
            
        # Visualize results
        try:
            # Display results
            ax = get_ax(1)
            r = results[0]
            
            visualize.display_instances(
                image, r['rois'], r['masks'], r['class_ids'],
                dataset.class_names, r['scores'], ax=ax,
                title=f"Predictions for {os.path.basename(image_path)}"
            )
            
            # Save the result
            output_file = os.path.join(output_dir, f"result_{os.path.basename(image_path)}")
            plt.savefig(output_file)
            print(f"Result saved to {output_file}")
            
            # Close the figure to prevent memory leaks
            plt.close()
            
            successful_detections += 1
        except Exception as e:
            print(f"ERROR: Failed to visualize results for {image_path}: {e}")
            plt.close()  # Make sure to close any open figures
            continue
            
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while processing {image_path}: {e}")
        continue

print(f"\nDetection completed. Successfully processed {successful_detections} out of {len(image_files)} images.")
print(f"Results are saved in the '{output_dir}' directory.")

