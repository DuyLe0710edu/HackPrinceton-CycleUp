#!/bin/bash

echo "Fixing camera environment issues..."

# Kill any running Python processes
pkill -f python || true
pkill -f app.py || true

# Kill any process using port 8000 (where the backend runs)
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Set environment variables for OpenCV
export OPENCV_FFMPEG_CAPTURE_OPTIONS="video_codec;h264_videotoolbox"
export OPENCV_VIDEOIO_DEBUG=1
export PYTHONUNBUFFERED=1 

# Fix camera access on macOS
echo "Ensuring camera access for the application..."
if [ -d "/Library/CoreMediaIO/Plug-Ins/DAL" ]; then
  sudo -n killall VDCAssistant 2>/dev/null || true
  sudo -n killall AppleCameraAssistant 2>/dev/null || true
else
  killall VDCAssistant 2>/dev/null || true
  killall AppleCameraAssistant 2>/dev/null || true
fi

# Clean up any cached files
find ./backend -name "*.pyc" -delete
find ./backend -name "__pycache__" -type d -exec rm -rf {} +;

echo "Camera environment repaired! Please restart the backend with:"
echo "cd backend && OPENCV_FFMPEG_CAPTURE_OPTIONS=\"video_codec;h264_videotoolbox\" PYTHONUNBUFFERED=1 python app.py" 