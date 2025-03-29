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

## Camera Troubleshooting

If the camera feed is not displaying properly in the application, follow these steps to fix common issues:

### Quick Fix: Use the Camera Fix Script

We've created a script to automatically fix common camera issues:

1. From the project root, run:
   ```bash
   ./fix_camera.sh
   ```

2. After the script completes, start the backend with the proper environment variables:
   ```bash
   cd backend
   OPENCV_FFMPEG_CAPTURE_OPTIONS="video_codec;h264_videotoolbox" PYTHONUNBUFFERED=1 python app.py
   ```

### Common Camera Issues and Solutions

1. **Camera shows as connected but no image appears**
   - This is often an environment variable or terminal issue
   - Run the fix_camera.sh script to reset the camera system
   - Ensure you're using the correct environment variables when starting the backend

2. **Multiple cameras detected (phone and computer)**
   - The application is configured to use the first camera (index 0)
   - Disconnect or disable other camera devices if needed
   - You can modify the `initialize_camera()` function in app.py to explicitly use a different camera index

3. **Permission issues with the camera**
   - Make sure your application has camera permissions in system settings
   - The Info.plist file contains macOS camera permission requirements
   - Try restarting your computer if permissions appear stuck

### Manual Camera Reset

If the fix_camera.sh script doesn't solve your issue:

1. Kill any Python processes that might be using the camera:
   ```bash
   pkill -f python
   ```

2. Reset the macOS camera system:
   ```bash
   sudo killall VDCAssistant
   sudo killall AppleCameraAssistant
   ```

3. Clear any Python cache:
   ```bash
   find ./backend -name "*.pyc" -delete
   find ./backend -name "__pycache__" -type d -exec rm -rf {} +
   ```

4. Start the backend with proper environment variables:
   ```bash
   export OPENCV_FFMPEG_CAPTURE_OPTIONS="video_codec;h264_videotoolbox"
   export OPENCV_VIDEOIO_DEBUG=1
   export PYTHONUNBUFFERED=1
   cd backend
   python app.py
   ```

### Why Camera Issues Occur

The camera detection system is vulnerable to environment variables and terminal session issues because:

1. OpenCV's camera handling is sensitive to environment variables
2. WebSocket connections can be interrupted by terminal state changes
3. Camera access permissions can get stuck between sessions
4. Multiple processes trying to access the camera can cause conflicts

Always make sure to properly shut down the application when you're done to avoid camera resource conflicts in future sessions.
