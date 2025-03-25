import React, { useRef, useEffect, useState } from 'react';
import './CameraDetection.css';
import { startDetection, stopDetection, connectToSocket } from '../services/api';

function CameraDetection({ onDetectionUpdate }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);
  const imageRef = useRef(null);
  const socketRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());
  const [isLoading, setIsLoading] = useState(false);

  // Start detection with backend
  const handleStartDetection = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await startDetection();
      console.log("Detection started:", response);
      setIsProcessing(true);
      
      // Connect to the WebSocket for receiving detection updates
      socketRef.current = connectToSocket((data) => {
        if (imageRef.current) {
          // Update the image with the processed frame
          imageRef.current.src = `data:image/jpeg;base64,${data.frame}`;
          
          // Calculate FPS
          const now = Date.now();
          const deltaTime = now - lastUpdateTimeRef.current;
          if (deltaTime > 0) {
            setFps(Math.round(1000 / deltaTime));
          }
          lastUpdateTimeRef.current = now;
          
          // Update detection results
          onDetectionUpdate(data.detections);
        }
      });
      
      setIsStreaming(true);
    } catch (err) {
      console.error("Error starting detection:", err);
      setError(`Failed to start detection: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop detection
  const handleStopDetection = async () => {
    try {
      const response = await stopDetection();
      console.log("Detection stopped:", response);
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsProcessing(false);
      onDetectionUpdate([]);
    } catch (err) {
      console.error("Error stopping detection:", err);
      setError(`Failed to stop detection: ${err.message}`);
    }
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isProcessing) {
        handleStopDetection();
      }
    };
  }, [isProcessing]);

  useEffect(() => {
    // Create a function to check backend availability
    const checkBackendStatus = async () => {
      try {
        await fetch('http://localhost:5000/api/info');
        setError(null);
      } catch (err) {
        setError("Cannot connect to backend. Please ensure the backend server is running.");
      }
    };
    
    // Run on component mount
    checkBackendStatus();
    
    // Set up interval to check periodically
    const interval = setInterval(checkBackendStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="camera-detection">
      <h2>Trash Detection Camera</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="camera-container">
        {/* The image will display the processed frames from the backend */}
        <img 
          ref={imageRef} 
          className="camera-feed" 
          alt="Camera feed"
          src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
        />
        
        {!isStreaming && !isProcessing && (
          <div className="camera-overlay">
            <button onClick={handleStartDetection} className="start-button" disabled={isLoading}>
              {isLoading ? "Connecting..." : "Start Detection"}
            </button>
          </div>
        )}
        
        {isStreaming && isProcessing && (
          <>
            <div className="fps-counter">FPS: {fps}</div>
            <div className="camera-controls">
              <button onClick={handleStopDetection} className="stop-button">
                Stop Detection
              </button>
            </div>
          </>
        )}
      </div>
      
      <div className="camera-settings">
        <button className="settings-button">
          <span>⚙️</span> Detection Settings
        </button>
      </div>
    </div>
  );
}

export default CameraDetection; 