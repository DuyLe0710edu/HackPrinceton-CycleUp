import React, { useRef, useEffect, useState } from 'react';
import './MediaPipeRecognition.css';

// Import from the specific @mediapipe packages directly - this is the most reliable approach
import { FilesetResolver } from '@mediapipe/tasks-vision';

function MediaPipeRecognition() {
  // Refs for the video and canvas elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State for enabling/disabling each detection
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [poseEnabled, setPoseEnabled] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  
  // State for camera running
  const [cameraRunning, setCameraRunning] = useState(false);
  
  // State for loading status
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [modelLoadingStatus, setModelLoadingStatus] = useState({
    face: 'Not loaded',
    pose: 'Not loaded',
    gesture: 'Not loaded'
  });
  
  // State for logs
  const [faceLog, setFaceLog] = useState('No face detection running');
  const [poseLog, setPoseLog] = useState('No pose detection running');
  const [gestureLog, setGestureLog] = useState('No gesture detection running');
  
  // State to track errors
  const [error, setError] = useState(null);
  
  // State for FPS tracking
  const [fps, setFps] = useState(0);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  // References for MediaPipe objects
  const faceLandmarkerRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const drawingUtilsRef = useRef(null);
  const visionRef = useRef(null); // Store the vision reference
  
  // Running mode
  const runningModeRef = useRef("VIDEO");
  
  // Last video frame time to avoid duplicate processing
  const lastVideoTimeRef = useRef(-1);
  
  // References for throttling log updates
  const lastPoseUpdateTimeRef = useRef(0);
  const currentPoseLogRef = useRef('No pose detection running');
  
  // Add debug logs
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Helper to add debug logs with timestamps
  const addDebugLog = (message) => {
    const timestamp = new Date().toISOString().substr(11, 12);
    const logMessage = `${timestamp}: ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev, logMessage]);
  };
  
  // Toggle debug panel
  const toggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
  };
  
  // Toggle face detection
  const toggleFaceDetection = () => {
    if (loading) return;
    setFaceEnabled(!faceEnabled);
  };

  // Toggle pose detection
  const togglePoseDetection = () => {
    if (loading) return;
    setPoseEnabled(!poseEnabled);
  };

  // Toggle gesture recognition
  const toggleGestureRecognition = () => {
    if (loading) return;
    setGestureEnabled(!gestureEnabled);
  };

  // Initialize MediaPipe objects - runs once on component mount
  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        setInitializing(true);
        addDebugLog('Initializing MediaPipe...');
        
        // Import necessary modules dynamically
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        // Store the vision reference
        visionRef.current = vision;
        
        // Use dynamic imports for PoseLandmarker, FaceLandmarker, and GestureRecognizer
        const [
          { PoseLandmarker },
          { FaceLandmarker },
          { GestureRecognizer },
          { DrawingUtils }
        ] = await Promise.all([
          import('@mediapipe/tasks-vision'),
          import('@mediapipe/tasks-vision'), 
          import('@mediapipe/tasks-vision'),
          import('@mediapipe/tasks-vision')
        ]);
        
        // Make them available globally if needed (for consistent API with examples)
        window.PoseLandmarker = PoseLandmarker;
        window.FaceLandmarker = FaceLandmarker;
        window.GestureRecognizer = GestureRecognizer;
        window.DrawingUtils = DrawingUtils;
        
        // Initialize drawing utils
        if (canvasRef.current) {
          const canvasCtx = canvasRef.current.getContext('2d');
          drawingUtilsRef.current = new DrawingUtils(canvasCtx);
          addDebugLog('Drawing utils initialized');
        }
        
        addDebugLog('MediaPipe Vision initialized successfully');
        setInitializing(false);
      } catch (err) {
        console.error('Error setting up MediaPipe:', err);
        addDebugLog(`Error setting up MediaPipe: ${err.message}`);
        
        // Provide more helpful error messages based on the error
        let errorMessage = `Failed to initialize MediaPipe: ${err.message}`;
        
        if (err.message.includes('WebAssembly.instantiate')) {
          errorMessage = 'Error loading MediaPipe WASM files. This may be due to CORS issues or network problems. Please try using a different browser or connection.';
        }
        
        setError(errorMessage);
        setInitializing(false);
      }
    };
    
    initializeMediaPipe();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      addDebugLog("Starting camera");
      setCameraRunning(true);
    } catch (err) {
      console.error("Failed to start camera:", err);
      setError(`Failed to start camera: ${err.message}`);
      addDebugLog(`Error starting camera: ${err.message}`);
    }
  };

  // Stop camera
  const stopCamera = () => {
    addDebugLog("Stopping camera");
    setCameraRunning(false);
    
    // Stop the camera
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  // Handle camera toggle
  useEffect(() => {
    const video = videoRef.current;
    
    if (cameraRunning) {
      addDebugLog('Starting camera...');
      // Start the camera
      navigator.mediaDevices.getUserMedia({ 
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      })
        .then(stream => {
          // Attach the stream to the video element
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play();
            addDebugLog('Camera started successfully');
          };
        })
        .catch(err => {
          console.error('Error accessing camera:', err);
          setError(`Failed to access camera: ${err.message}`);
          addDebugLog(`Error accessing camera: ${err.message}`);
          setCameraRunning(false);
        });
    } else {
      // Stop the camera
      if (video && video.srcObject) {
        addDebugLog('Stopping camera...');
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
        addDebugLog('Camera stopped');
      }
    }
    
    return () => {
      // Clean up camera on unmount or when cameraRunning changes
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [cameraRunning]);
  
  // Load pose model when pose detection is enabled
  useEffect(() => {
    const initializePoseLandmarker = async () => {
      if (!window.PoseLandmarker || !poseEnabled || poseLandmarkerRef.current || !visionRef.current) {
        return;
      }
      
      try {
        setLoading(true);
        addDebugLog('Loading pose landmarker model...');
        setModelLoadingStatus(prev => ({ ...prev, pose: 'Loading...' }));
        
        // Create pose landmarker
        const poseLandmarker = await window.PoseLandmarker.createFromOptions(visionRef.current, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: runningModeRef.current,
          numPoses: 1
        });
        
        poseLandmarkerRef.current = poseLandmarker;
        addDebugLog('Pose landmarker loaded successfully');
        setModelLoadingStatus(prev => ({ ...prev, pose: 'Ready' }));
      } catch (err) {
        console.error('Error loading pose landmarker:', err);
        addDebugLog(`Error loading pose landmarker: ${err.message}`);
        setError(`Failed to load pose model: ${err.message}`);
        setModelLoadingStatus(prev => ({ ...prev, pose: 'Error' }));
        setPoseEnabled(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (poseEnabled) {
      initializePoseLandmarker();
    }
  }, [poseEnabled]);
  
  // Load face model when face detection is enabled
  useEffect(() => {
    const initializeFaceLandmarker = async () => {
      if (!window.FaceLandmarker || !faceEnabled || faceLandmarkerRef.current || !visionRef.current) {
        return;
      }
      
      try {
        setLoading(true);
        addDebugLog('Loading face landmarker model...');
        setModelLoadingStatus(prev => ({ ...prev, face: 'Loading...' }));
        
        // Create face landmarker
        const faceLandmarker = await window.FaceLandmarker.createFromOptions(visionRef.current, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: runningModeRef.current,
          numFaces: 1
        });
        
        faceLandmarkerRef.current = faceLandmarker;
        addDebugLog('Face landmarker loaded successfully');
        setModelLoadingStatus(prev => ({ ...prev, face: 'Ready' }));
      } catch (err) {
        console.error('Error loading face landmarker:', err);
        addDebugLog(`Error loading face landmarker: ${err.message}`);
        setError(`Failed to load face model: ${err.message}`);
        setModelLoadingStatus(prev => ({ ...prev, face: 'Error' }));
        setFaceEnabled(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (faceEnabled) {
      initializeFaceLandmarker();
    }
  }, [faceEnabled]);
  
  // Load gesture model when gesture recognition is enabled
  useEffect(() => {
    const initializeGestureRecognizer = async () => {
      if (!window.GestureRecognizer || !gestureEnabled || gestureRecognizerRef.current || !visionRef.current) {
        return;
      }
      
      try {
        setLoading(true);
        addDebugLog('Loading gesture recognizer model...');
        setModelLoadingStatus(prev => ({ ...prev, gesture: 'Loading...' }));
        
        // Create gesture recognizer
        const gestureRecognizer = await window.GestureRecognizer.createFromOptions(visionRef.current, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU'
          },
          runningMode: runningModeRef.current,
          numHands: 2
        });
        
        gestureRecognizerRef.current = gestureRecognizer;
        addDebugLog('Gesture recognizer loaded successfully');
        setModelLoadingStatus(prev => ({ ...prev, gesture: 'Ready' }));
      } catch (err) {
        console.error('Error loading gesture recognizer:', err);
        addDebugLog(`Error loading gesture recognizer: ${err.message}`);
        setError(`Failed to load gesture model: ${err.message}`);
        setModelLoadingStatus(prev => ({ ...prev, gesture: 'Error' }));
        setGestureEnabled(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (gestureEnabled) {
      initializeGestureRecognizer();
    }
  }, [gestureEnabled]);
  
  // Main detection loop
  useEffect(() => {
    // Only run if camera is running and at least one detection is enabled
    if (!cameraRunning || (!faceEnabled && !poseEnabled && !gestureEnabled)) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !drawingUtilsRef.current) {
      return;
    }
    
    // Set running mode to VIDEO if it's not already
    const updateRunningModes = async () => {
      try {
        if (runningModeRef.current !== "VIDEO") {
          runningModeRef.current = "VIDEO";
          addDebugLog('Changing running mode to VIDEO');
          
          // Update running mode for each enabled detector
          if (poseEnabled && poseLandmarkerRef.current) {
            await poseLandmarkerRef.current.setOptions({ runningMode: "VIDEO" });
          }
          
          if (faceEnabled && faceLandmarkerRef.current) {
            await faceLandmarkerRef.current.setOptions({ runningMode: "VIDEO" });
          }
          
          if (gestureEnabled && gestureRecognizerRef.current) {
            await gestureRecognizerRef.current.setOptions({ runningMode: "VIDEO" });
          }
        }
      } catch (err) {
        console.error('Error updating running mode:', err);
        addDebugLog(`Error updating running mode: ${err.message}`);
      }
    };
    
    updateRunningModes();
    
    const canvasCtx = canvas.getContext('2d');
    const drawingUtils = drawingUtilsRef.current;
    
    // Function to predict webcam frames
    const predictWebcam = async () => {
      // Get current time for performance measurement
      const startTimeMs = performance.now();
      
      // Only process if video time has changed
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        
        // Clear the canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Process frames with each enabled detector
        try {
          // Pose detection
          if (poseEnabled && poseLandmarkerRef.current) {
            const poseResults = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);
            
            // Draw pose landmarks
            if (poseResults.landmarks) {
              for (const landmark of poseResults.landmarks) {
                drawingUtils.drawConnectors(
                  landmark,
                  window.PoseLandmarker.POSE_CONNECTIONS,
                  { color: '#00FF00', lineWidth: 2 }
                );
                drawingUtils.drawLandmarks(
                  landmark,
                  { color: '#00FF00', radius: 3 }
                );
              }
            }
            
            // Update pose log with throttling to avoid excessive renders
            if (poseResults.landmarks && poseResults.landmarks.length > 0) {
              currentPoseLogRef.current = `Detected ${poseResults.landmarks.length} person(s)`;
              
              // Only update state every 200ms to prevent excessive re-renders
              const now = performance.now();
              if (now - lastPoseUpdateTimeRef.current > 200) {
                setPoseLog(currentPoseLogRef.current);
                lastPoseUpdateTimeRef.current = now;
              }
            } else {
              currentPoseLogRef.current = 'No poses detected';
              
              // Only update state every 200ms
              const now = performance.now();
              if (now - lastPoseUpdateTimeRef.current > 200) {
                setPoseLog(currentPoseLogRef.current);
                lastPoseUpdateTimeRef.current = now;
              }
            }
          }
          
          // Face detection (simplified since focusing on pose)
          if (faceEnabled && faceLandmarkerRef.current) {
            const faceResults = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
            
            // Draw face landmarks
            if (faceResults.faceLandmarks) {
              for (const landmarks of faceResults.faceLandmarks) {
                drawingUtils.drawConnectors(
                  landmarks,
                  window.FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                  { color: '#C0C0C070', lineWidth: 1 }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  window.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                  { color: '#FF3030' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  window.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                  { color: '#30FF30' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  window.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                  { color: '#E0E0E0' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  window.FaceLandmarker.FACE_LANDMARKS_LIPS,
                  { color: '#E0E0E0' }
                );
              }
              
              setFaceLog(`Detected ${faceResults.faceLandmarks.length} face(s)`);
            } else {
              setFaceLog('No faces detected');
            }
          }
          
          // Gesture recognition (simplified since focusing on pose)
          if (gestureEnabled && gestureRecognizerRef.current) {
            const gestureResults = gestureRecognizerRef.current.recognizeForVideo(video, startTimeMs);
            
            // Draw hand landmarks
            if (gestureResults.landmarks) {
              for (const landmarks of gestureResults.landmarks) {
                drawingUtils.drawConnectors(
                  landmarks,
                  window.GestureRecognizer.HAND_CONNECTIONS,
                  { color: '#00FFFF', lineWidth: 2 }
                );
                drawingUtils.drawLandmarks(
                  landmarks,
                  { color: '#FF0000', radius: 2 }
                );
              }
            }
            
            // Update gesture log
            if (gestureResults.gestures && 
                gestureResults.gestures.length > 0 && 
                gestureResults.gestures[0].length > 0) {
              const gesture = gestureResults.gestures[0][0];
              const hand = gestureResults.handedness && gestureResults.handedness[0] ? 
                        gestureResults.handedness[0][0].displayName : 'Unknown';
              
              setGestureLog(`Detected ${gesture.categoryName} (${(gesture.score * 100).toFixed(0)}%) - ${hand} hand`);
            } else {
              setGestureLog('No gestures detected');
            }
          }
          
          // Calculate and update FPS
          const endTimeMs = performance.now();
          const processingTimeMs = endTimeMs - startTimeMs;
          const calculatedFps = 1000 / processingTimeMs;
          
          // Update FPS every 500ms to avoid excessive re-renders
          if (endTimeMs - lastPoseUpdateTimeRef.current > 500) {
            setFps(Math.round(calculatedFps));
          }
        } catch (err) {
          console.error('Error in detection loop:', err);
          addDebugLog(`Error in detection loop: ${err.message}`);
        }
      }
      
      // Continue the detection loop
      if (cameraRunning && (faceEnabled || poseEnabled || gestureEnabled)) {
        requestAnimationFrame(predictWebcam);
      }
    };
    
    // Start the detection loop
    requestAnimationFrame(predictWebcam);
    
    // Cleanup function
    return () => {
      // No need to explicitly cancel animation frame as the conditional
      // check in the predictWebcam function will stop the loop
    };
  }, [cameraRunning, faceEnabled, poseEnabled, gestureEnabled]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Close all models
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch (e) {
          console.error('Error closing face landmarker:', e);
        }
      }
      
      if (poseLandmarkerRef.current) {
        try {
          poseLandmarkerRef.current.close();
        } catch (e) {
          console.error('Error closing pose landmarker:', e);
        }
      }
      
      if (gestureRecognizerRef.current) {
        try {
          gestureRecognizerRef.current.close();
        } catch (e) {
          console.error('Error closing gesture recognizer:', e);
        }
      }
      
      // Stop camera
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  return (
    <div className="mediapipe-recognition">
      <h1>MediaPipe Recognition</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="recognition-container">
        {/* Camera feed and overlay canvas */}
        <div className="camera-container">
          <video
            ref={videoRef}
            className="input-video"
            width="640"
            height="480"
            playsInline
          ></video>
          <canvas
            ref={canvasRef}
            className="output-canvas"
            width="640"
            height="480"
          ></canvas>
          
          {/* Feature toggle buttons at the top - always visible */}
          <div className="camera-top-controls">
            <button
              className={`feature-toggle-button ${faceEnabled ? 'active' : ''}`}
              onClick={toggleFaceDetection}
              disabled={loading || initializing}
            >
              Face Detection
            </button>
            <button
              className={`feature-toggle-button ${poseEnabled ? 'active' : ''}`}
              onClick={togglePoseDetection}
              disabled={loading || initializing}
            >
              Pose Detection
            </button>
            <button
              className={`feature-toggle-button ${gestureEnabled ? 'active' : ''}`}
              onClick={toggleGestureRecognition}
              disabled={loading || initializing}
            >
              Gesture Recognition
            </button>
          </div>
          
          {!cameraRunning && (
            <div className="camera-overlay">
              <button 
                onClick={startCamera}
                className="start-button"
                disabled={initializing}
              >
                {initializing ? "Initializing MediaPipe..." : "Start Camera"}
              </button>
            </div>
          )}
          
          {fps > 0 && (
            <div className="fps-counter">
              FPS: {fps}
            </div>
          )}
          
          {cameraRunning && (
            <div className="camera-controls">
              <button 
                onClick={stopCamera}
                className="stop-button"
              >
                Stop Camera
              </button>
            </div>
          )}
          
          {(loading || initializing) && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>
                {initializing 
                  ? "Initializing MediaPipe... This may take a moment" 
                  : "Loading models... This may take a moment"}
              </p>
              <p className="loading-tip">
                (If loading takes too long, please check your internet connection and try refreshing the page)
              </p>
            </div>
          )}
          
          {/* Recognition status display */}
          <div className="recognition-status">
            <div className="status-item">
              <span>Face: </span>
              <span className={`status-badge ${modelLoadingStatus.face === 'Ready' ? 'ready' : modelLoadingStatus.face === 'Error' ? 'error' : ''}`}>
                {modelLoadingStatus.face}
              </span>
            </div>
            <div className="status-item">
              <span>Pose: </span>
              <span className={`status-badge ${modelLoadingStatus.pose === 'Ready' ? 'ready' : modelLoadingStatus.pose === 'Error' ? 'error' : ''}`}>
                {modelLoadingStatus.pose}
              </span>
            </div>
            <div className="status-item">
              <span>Gesture: </span>
              <span className={`status-badge ${modelLoadingStatus.gesture === 'Ready' ? 'ready' : modelLoadingStatus.gesture === 'Error' ? 'error' : ''}`}>
                {modelLoadingStatus.gesture}
              </span>
            </div>
          </div>
        </div>
        
        {/* Logs section at the bottom */}
        <div className="logs-section">
          <div className="detection-logs">
            <div className={`log-panel ${faceEnabled ? 'active' : ''}`}>
              <h3>Face Detection Log</h3>
              <div className="log-content">{faceLog}</div>
            </div>
            
            <div className={`log-panel ${poseEnabled ? 'active' : ''}`}>
              <h3>Pose Detection Log</h3>
              <div className="log-content">{poseLog}</div>
            </div>
            
            <div className={`log-panel ${gestureEnabled ? 'active' : ''}`}>
              <h3>Gesture Recognition Log</h3>
              <div className="log-content">{gestureLog}</div>
            </div>
          </div>
          
          {/* Debug logs panel */}
          <div className="debug-section">
            <button 
              className="debug-toggle"
              onClick={toggleDebugPanel}
            >
              {showDebugPanel ? "Hide Debug Logs" : "Show Debug Logs"}
            </button>
            
            {showDebugPanel && (
              <div className="debug-panel">
                <h3>Initialization Logs</h3>
                <div className="debug-logs">
                  {debugLogs.length === 0 ? (
                    <p>No logs recorded yet</p>
                  ) : (
                    <ul>
                      {debugLogs.map((log, index) => (
                        <li key={index}>{log}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Settings button at the bottom */}
          <div className="recognition-settings">
            <button className="settings-button">
              <span>⚙️</span> Recognition Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaPipeRecognition; 