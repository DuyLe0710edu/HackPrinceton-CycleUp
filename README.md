# Trash Detection and Classification using YOLOv8

This project aims to detect and classify different types of trash using YOLOv8 for potential integration with robotic systems.

## Project Structure

- `data/`: Contains training and testing data
  - `images/`: Image files for training and testing
  - `labels/`: Annotation files for training
  - `datasets/`: Organized datasets
- `models/`: Saved model files and weights
- `scripts/`: Python scripts for training, evaluation, and inference
- `notebooks/`: Jupyter notebooks for experimentation and visualization
- `utils/`: Utility functions and helper scripts
- `app/`: Web application for demo purposes
  - `static/`: Static files (CSS, JS)
  - `templates/`: HTML templates

## Getting Started

1. Set up the environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Download YOLOv8 model:
   ```bash
   python scripts/download_models.py
   ```

3. Run the detection:
   ```bash
   python scripts/detect.py --source data/images/test.jpg
   ```

## Requirements

See `requirements.txt` for a complete list of dependencies.


## How can we run the frontend
cd hackathon/frontend
npm install
npm start
