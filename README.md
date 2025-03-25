# 🗑️ Trash Detection and Classification System

> **A smart solution for detecting and classifying different types of trash using YOLOv8, with an interactive web interface**

![Trash Detection](https://img.shields.io/badge/Application-Trash%20Detection-brightgreen)
![Technologies](https://img.shields.io/badge/ML-YOLOv8-blue)
![Frontend](https://img.shields.io/badge/Frontend-React-61dafb)
![Backend](https://img.shields.io/badge/Backend-Python%20Flask-yellow)

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Project Overview](#-project-overview)
- [Setup Instructions](#-setup-instructions)
- [Project Structure](#-project-structure)
- [Development Guide](#-development-guide)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/DuyLe0710edu/hackathon-on-the-track.git
cd hackathon-on-the-track

# Set up backend (in one terminal)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd app
python app.py

# Set up frontend (in another terminal)
cd frontend
npm install
npm start
```

Visit: http://localhost:3000 to see the application in action!

---

## 🔍 Project Overview

This project combines computer vision and machine learning to detect and classify different types of trash. It's designed for potential integration with robotic systems for automated waste sorting and management.

**Key Features:**
- ✅ Trash detection using YOLOv8
- ✅ Multiple trash category classification
- ✅ Interactive web interface
- ✅ Real-time image processing
- ✅ Easy deployment

---

## ⚙️ Setup Instructions

### 🐍 Backend Setup

1. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

2. **Activate the environment**
   ```bash
   # On macOS/Linux:
   source venv/bin/activate
   
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download YOLOv8 model**
   ```bash
   python scripts/download_models.py
   ```

5. **Run the backend server**
   ```bash
   cd app
   python app.py
   ```
   The API will be available at http://localhost:5000

### 🖥️ Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```
   The web interface will be available at http://localhost:3000

### ⚠️ Important: Virtual Environment Management

**DO NOT push virtual environments to GitHub!**

We use `.gitignore` to exclude:
- `venv/`
- `trash_env/`
- `ENV/`

---

## 📂 Project Structure

```
hackathon-on-the-track/
├── app/                # Backend Flask application
│   ├── static/         # Static assets
│   └── templates/      # HTML templates
├── data/
│   ├── images/         # Training and test images
│   └── labels/         # Annotation files
├── frontend/           # React frontend application
├── models/             # Saved model weights
├── notebooks/          # Jupyter notebooks for experiments
├── scripts/            # Python scripts for training/inference
└── utils/              # Helper utilities
```

---

## 🛠️ Development Guide

### 📚 Technologies Used

- **Backend:**
  - Python
  - Flask API
  - YOLOv8 (object detection)
  - TensorFlow/PyTorch

- **Frontend:**
  - React
  - JavaScript/TypeScript
  - CSS/HTML

### 📦 Adding New Dependencies

When adding Python packages:

1. **Install in your virtual environment**
   ```bash
   pip install new-package
   ```

2. **Update requirements.txt**
   ```bash
   pip freeze > requirements.txt
   ```

3. **Commit changes**
   ```bash
   git add requirements.txt
   git commit -m "Add new-package dependency"
   ```

### 🧪 Testing the Model

Test the detection on sample images:
```bash
python scripts/detect.py --source data/images/test.jpg
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| **Git large file errors** | Make sure you're not pushing any virtual environment files. Check `.gitignore` is working properly. |
| **Missing dependencies** | Ensure your virtual environment is activated and you've run `pip install -r requirements.txt` |
| **Model download errors** | Manually download YOLOv8 weights from Ultralytics and place in the models directory |
| **Frontend connection issues** | Check if backend is running and CORS is properly configured |

---

## 👥 Contributing

1. Create a branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

See [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for the environment
</p>
