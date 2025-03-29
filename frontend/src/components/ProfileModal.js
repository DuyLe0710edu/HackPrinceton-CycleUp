import React, { useRef, useState, useEffect } from 'react';
import './ProfileModal.css';

function ProfileModal({ isOpen, onClose, onSave, currentProfile }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [sketchImage, setSketchImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState('capture'); // 'capture', 'preview', 'view'
  const [selectedFilter, setSelectedFilter] = useState('pencil'); // 'pencil', 'outline', 'charcoal', 'comic'
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (currentProfile) {
        // If we have a current profile, show it first
        setSketchImage(currentProfile);
        setMode('view');
      } else {
        // Otherwise go to capture mode
        startCamera();
        setMode('capture');
      }
    } else {
      stopCamera();
      setMode('capture');
      setCapturedImage(null);
      setSketchImage(null);
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, currentProfile]);
  
  const startCamera = async () => {
    try {
      // First clean up any existing streams
      stopCamera();
      
      const videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 400, 
          height: 400,
          facingMode: 'user' 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
      }
      
      setStream(videoStream);
      setMode('capture');
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access your camera. Please check permissions.');
    }
  };
  
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };
  
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
    
    // Stop the camera
    stopCamera();
    
    // Process the image to create pencil sketch effect
    createPencilSketch(canvas);
    
    // Change mode to preview
    setMode('preview');
  };
  
  const retakePhoto = () => {
    setCapturedImage(null);
    setSketchImage(null);
    startCamera();
    setMode('capture');
  };
  
  const createPencilSketch = async (canvas) => {
    setProcessing(true);
    
    try {
      switch(selectedFilter) {
        case 'original':
          // Simply use the original photo without filters
          setSketchImage(capturedImage);
          break;
        case 'outline':
          await createOutlineSketch(canvas);
          break;
        case 'charcoal':
          await createCharcoalSketch(canvas);
          break;
        case 'comic':
          await createComicSketch(canvas);
          break;
        case 'pencil':
        default:
          await createClassicPencilSketch(canvas);
          break;
      }
    } catch (err) {
      console.error('Error creating sketch:', err);
    } finally {
      setProcessing(false);
    }
  };
  
  // Classic pencil sketch effect
  const createClassicPencilSketch = async (canvas) => {
    // Create a new canvas for the sketch
    const sketchCanvas = document.createElement('canvas');
    sketchCanvas.width = canvas.width;
    sketchCanvas.height = canvas.height;
    const sketchCtx = sketchCanvas.getContext('2d');
    
    // First, create a high-contrast grayscale image
    sketchCtx.drawImage(canvas, 0, 0);
    sketchCtx.globalCompositeOperation = 'color';
    sketchCtx.fillStyle = 'white';
    sketchCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset composite operation
    sketchCtx.globalCompositeOperation = 'source-over';
    
    // Apply edge detection using a convoluted approach
    // First, create an edge-enhanced copy of the image
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = canvas.width;
    edgeCanvas.height = canvas.height;
    const edgeCtx = edgeCanvas.getContext('2d');
    
    // Draw the grayscale image
    edgeCtx.drawImage(sketchCanvas, 0, 0);
    
    // Invert for edge detection
    edgeCtx.globalCompositeOperation = 'difference';
    edgeCtx.fillStyle = 'white';
    edgeCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply a small blur (this creates edge contrast)
    edgeCtx.filter = 'blur(1px)';
    edgeCtx.drawImage(edgeCanvas, 0, 0);
    
    // Invert back
    edgeCtx.globalCompositeOperation = 'difference';
    edgeCtx.fillStyle = 'white';
    edgeCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply high contrast to make edges pop
    edgeCtx.filter = 'contrast(300%)';
    edgeCtx.drawImage(edgeCanvas, 0, 0);
    
    // Apply a sharpening effect
    edgeCtx.filter = 'brightness(150%) contrast(150%)';
    edgeCtx.globalCompositeOperation = 'source-over';
    edgeCtx.drawImage(edgeCanvas, 0, 0);
    
    // Final draw with pencil texture
    sketchCtx.globalCompositeOperation = 'source-over';
    sketchCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a slight paper texture background
    sketchCtx.fillStyle = '#f8f8f8';
    sketchCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the edges with a pencil-like color
    sketchCtx.globalAlpha = 0.8;
    sketchCtx.drawImage(edgeCanvas, 0, 0);
    
    // Get the result
    const sketchDataUrl = sketchCanvas.toDataURL('image/png');
    setSketchImage(sketchDataUrl);
  };
  
  // Bold outline sketch effect
  const createOutlineSketch = async (canvas) => {
    // Create a new canvas for the sketch
    const sketchCanvas = document.createElement('canvas');
    sketchCanvas.width = canvas.width;
    sketchCanvas.height = canvas.height;
    const sketchCtx = sketchCanvas.getContext('2d');
    
    // Draw the original image
    sketchCtx.drawImage(canvas, 0, 0);
    
    // Convert to grayscale with high contrast
    sketchCtx.globalCompositeOperation = 'saturation';
    sketchCtx.fillStyle = 'black';
    sketchCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply edge detection filter
    sketchCtx.globalCompositeOperation = 'source-over';
    sketchCtx.filter = 'brightness(1.1) contrast(400%)';
    sketchCtx.drawImage(sketchCanvas, 0, 0);
    
    // Apply threshold to create stark black and white
    sketchCtx.filter = 'brightness(1000%) contrast(1000%)';
    sketchCtx.drawImage(sketchCanvas, 0, 0);
    
    // Invert to get black lines on white background
    sketchCtx.globalCompositeOperation = 'difference';
    sketchCtx.fillStyle = 'white';
    sketchCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get the result
    const sketchDataUrl = sketchCanvas.toDataURL('image/png');
    setSketchImage(sketchDataUrl);
  };
  
  // Charcoal sketch effect
  const createCharcoalSketch = async (canvas) => {
    // Create a new canvas for the sketch
    const sketchCanvas = document.createElement('canvas');
    sketchCanvas.width = canvas.width;
    sketchCanvas.height = canvas.height;
    const sketchCtx = sketchCanvas.getContext('2d');
    
    // Draw the original image
    sketchCtx.drawImage(canvas, 0, 0);
    
    // Convert to grayscale
    sketchCtx.globalCompositeOperation = 'saturation';
    sketchCtx.fillStyle = 'black';
    sketchCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset composite operation
    sketchCtx.globalCompositeOperation = 'source-over';
    
    // Add noise texture
    sketchCtx.filter = 'contrast(150%) brightness(0.9)';
    sketchCtx.drawImage(sketchCanvas, 0, 0);
    
    // Add dark edges
    sketchCtx.filter = 'blur(1px) contrast(200%)';
    sketchCtx.globalAlpha = 0.3;
    sketchCtx.drawImage(sketchCanvas, 0, 0);
    
    // Restore alpha and add final contrast
    sketchCtx.globalAlpha = 1.0;
    sketchCtx.filter = 'contrast(120%) brightness(90%)';
    sketchCtx.drawImage(sketchCanvas, 0, 0);
    
    // Get the result
    const sketchDataUrl = sketchCanvas.toDataURL('image/png');
    setSketchImage(sketchDataUrl);
  };
  
  // Comic style effect
  const createComicSketch = async (canvas) => {
    // Create a new canvas for the sketch
    const sketchCanvas = document.createElement('canvas');
    sketchCanvas.width = canvas.width;
    sketchCanvas.height = canvas.height;
    const sketchCtx = sketchCanvas.getContext('2d');
    
    // Draw the original image
    sketchCtx.drawImage(canvas, 0, 0);
    
    // Apply poster effect (reduce colors)
    sketchCtx.filter = 'saturate(150%) contrast(150%)';
    sketchCtx.drawImage(sketchCanvas, 0, 0);
    
    // Create a separate canvas for the edge detection
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = canvas.width;
    edgeCanvas.height = canvas.height;
    const edgeCtx = edgeCanvas.getContext('2d');
    
    // Draw the original for edge detection
    edgeCtx.drawImage(canvas, 0, 0);
    
    // Convert to grayscale for edge detection
    edgeCtx.globalCompositeOperation = 'saturation';
    edgeCtx.fillStyle = 'black';
    edgeCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset composite operation
    edgeCtx.globalCompositeOperation = 'source-over';
    
    // Create bold edges
    edgeCtx.filter = 'blur(1px) contrast(400%)';
    edgeCtx.drawImage(edgeCanvas, 0, 0);
    
    // Threshold to create black outlines
    edgeCtx.filter = 'brightness(1000%) contrast(1000%)';
    edgeCtx.drawImage(edgeCanvas, 0, 0);
    
    // Invert to get black lines
    edgeCtx.globalCompositeOperation = 'difference';
    edgeCtx.fillStyle = 'white';
    edgeCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the color version first
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');
    
    finalCtx.drawImage(sketchCanvas, 0, 0);
    
    // Then overlay the edges
    finalCtx.globalCompositeOperation = 'multiply';
    finalCtx.drawImage(edgeCanvas, 0, 0);
    
    // Get the result
    const sketchDataUrl = finalCanvas.toDataURL('image/png');
    setSketchImage(sketchDataUrl);
  };
  
  const saveProfile = () => {
    // Save the sketch image to localStorage
    if (sketchImage) {
      localStorage.setItem('userProfileSketch', sketchImage);
      if (onSave) onSave(sketchImage);
      onClose();
    }
  };
  
  const createNewProfile = () => {
    // Clear current profile and start camera
    setSketchImage(null);
    setCapturedImage(null);
    startCamera();
    setMode('capture');
  };

  return (
    <div className={`profile-modal ${isOpen ? 'open' : ''}`}>
      <div className="profile-modal-content">
        <div className="profile-modal-header">
          <h2>
            {mode === 'view' ? 'Your Profile Picture' : 'Create Profile Picture'}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="profile-modal-body">
          {mode === 'capture' && (
            // Camera view
            <div className="camera-view">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-preview"
              />
              <button 
                className="capture-button"
                onClick={capturePhoto}
              >
                Take Photo
              </button>
            </div>
          )}
          
          {mode === 'preview' && (
            // Photo preview with original and sketch
            <div className="photo-preview">
              <div className="image-container">
                <div className="original-image">
                  <h3>Original Photo</h3>
                  <img src={capturedImage} alt="Captured" />
                </div>
                
                <div className="sketch-image">
                  <h3>{selectedFilter === 'original' ? 'Original Photo' : 'Filtered Photo'}</h3>
                  {processing ? (
                    <div className="processing-indicator">Processing...</div>
                  ) : (
                    sketchImage ? (
                      <img src={sketchImage} alt={selectedFilter === 'original' ? 'Original' : 'Filtered'} />
                    ) : (
                      <div className="processing-indicator">Generating image...</div>
                    )
                  )}
                  
                  {/* Add filter selection options */}
                  <div className="filter-options">
                    <p>Select Style:</p>
                    <div className="filter-buttons">
                      <button 
                        className={`filter-button ${selectedFilter === 'original' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFilter('original');
                          createPencilSketch(canvasRef.current);
                        }}
                      >
                        Original
                      </button>
                      <button 
                        className={`filter-button ${selectedFilter === 'pencil' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFilter('pencil');
                          createPencilSketch(canvasRef.current);
                        }}
                      >
                        Pencil
                      </button>
                      <button 
                        className={`filter-button ${selectedFilter === 'outline' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFilter('outline');
                          createPencilSketch(canvasRef.current);
                        }}
                      >
                        Outline
                      </button>
                      <button 
                        className={`filter-button ${selectedFilter === 'charcoal' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFilter('charcoal');
                          createPencilSketch(canvasRef.current);
                        }}
                      >
                        Charcoal
                      </button>
                      <button 
                        className={`filter-button ${selectedFilter === 'comic' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFilter('comic');
                          createPencilSketch(canvasRef.current);
                        }}
                      >
                        Comic
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="button-group">
                <button 
                  className="retake-button"
                  onClick={retakePhoto}
                >
                  Retake
                </button>
                <button 
                  className="save-button"
                  onClick={saveProfile}
                  disabled={!sketchImage || processing}
                >
                  Save as Profile
                </button>
              </div>
            </div>
          )}
          
          {mode === 'view' && (
            // View current profile
            <div className="view-profile">
              <div className="current-profile-container">
                <img src={sketchImage} alt="Current Profile" className="current-profile-image" />
              </div>
              
              <div className="button-group">
                <button 
                  className="create-new-button"
                  onClick={createNewProfile}
                >
                  Create New Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default ProfileModal; 