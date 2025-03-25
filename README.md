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
- `frontend/`: React frontend application

## Getting Started

### Backend Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

   > **Note:** We don't push virtual environments (venv, trash_env) to GitHub because they contain large binary files and are system-specific. Instead, we use requirements.txt to specify dependencies that can be installed in a fresh environment.

3. Download YOLOv8 model:
   ```bash
   python scripts/download_models.py
   ```

4. Run the detection:
   ```bash
   python scripts/detect.py --source data/images/test.jpg
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Requirements

See `requirements.txt` for a complete list of Python dependencies.

## TensorFlow and PyTorch Dependencies

This project uses TensorFlow and PyTorch, which include large binary files. Instead of pushing these to GitHub:

1. We specify these as dependencies in requirements.txt
2. The setup process will download the appropriate versions for your system
3. We've added virtual environments (venv/, trash_env/) to .gitignore to avoid pushing large binaries

If you encounter issues with large files when pushing to GitHub, make sure you're not pushing any virtual environment directories, and use .gitignore to exclude them.

## Running the Application

### Backend API
```bash
cd app
python app.py
```

### Frontend
```bash
cd frontend
npm start
```

Your application should now be running at http://localhost:3000
