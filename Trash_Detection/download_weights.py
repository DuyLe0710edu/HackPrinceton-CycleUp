#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Download the Mask R-CNN model weights for trash detection.
"""

import os
import sys
import requests
import argparse

def download_file(url, local_filename):
    """Download a file from url to local_filename"""
    print(f"Downloading {url} to {local_filename}...")
    
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(local_filename, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
    return local_filename

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Download Mask R-CNN weights for trash detection.')
    
    parser.add_argument('--weights_dir', required=False,
                        default="weights",
                        metavar="/path/to/weights/",
                        help='Directory to save weights')
    args = parser.parse_args()
    
    # Create weights directory if it doesn't exist
    if not os.path.exists(args.weights_dir):
        os.makedirs(args.weights_dir)
    
    # Download COCO weights
    coco_weights_path = os.path.join(args.weights_dir, "mask_rcnn_coco.h5")
    if not os.path.exists(coco_weights_path):
        coco_url = "https://github.com/matterport/Mask_RCNN/releases/download/v2.0/mask_rcnn_coco.h5"
        download_file(coco_url, coco_weights_path)
    
    # For trash-specific weights, you would need a URL to download from
    # Since we don't have the actual URL for the trash weights, we're just notifying the user
    trash_weights_path = os.path.join(args.weights_dir, "mask_rcnn_trash_0200_030519_large.h5")
    if not os.path.exists(trash_weights_path):
        print(f"\nNOTE: The trash weights file {trash_weights_path} doesn't exist.")
        print("You'll need to either:")
        print("  1. Train the model yourself, or")
        print("  2. Manually place pre-trained weights in this location\n")

if __name__ == '__main__':
    main() 