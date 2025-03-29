import React, { useRef, useEffect, useState, useCallback } from 'react';
import './MediaPipeRecognition.css';
import { throttle } from 'lodash';
import { io } from 'socket.io-client';

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
  const lastFaceUpdateTimeRef = useRef(0);  
  const lastGestureUpdateTimeRef = useRef(0);
  const currentPoseLogRef = useRef('No pose detection running');
  
  // Detection performance tracking
  const detectionStatsRef = useRef({
    face: { count: 0, success: 0, lastFrameDetected: false },
    pose: { count: 0, success: 0, lastFrameDetected: false },
    gesture: { count: 0, success: 0, lastFrameDetected: false }
  });
  
  // Add debug logs
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Animation frame ID for proper cleanup
  const requestAnimationFrameIdRef = useRef(null);
  
  // Add new state for data saving status
  const [dataSaveStatus, setDataSaveStatus] = useState({
    face: { saving: false, lastSaved: null, error: null },
    pose: { saving: false, lastSaved: null, error: null },
    gesture: { saving: false, lastSaved: null, error: null }
  });
  
  // Add URL config for backend
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  
  // Add a throttled function to send recognition data to the backend
  // Only send data at most once every 2 seconds for each recognition type
  const sendToBackend = useCallback(
    throttle((type, data) => {
      if (!data) return;
      
      // Set saving status
      setDataSaveStatus(prev => ({
        ...prev,
        [type.toLowerCase()]: { 
          ...prev[type.toLowerCase()], 
          saving: true,
          error: null
        }
      }));
      
      // Prepare the payload
      const payload = {
        type: type,
        data: data
      };
      
      // Send data to the backend
      fetch(`${backendUrl}/api/mediapipe/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(response => response.json())
        .then(result => {
          // Update status on success
          setDataSaveStatus(prev => ({
            ...prev,
            [type.toLowerCase()]: { 
              saving: false,
              lastSaved: new Date().toISOString(),
              error: null
            }
          }));
          console.log(`${type} data saved successfully:`, result);
        })
        .catch(error => {
          // Update status on error
          setDataSaveStatus(prev => ({
            ...prev,
            [type.toLowerCase()]: { 
              saving: false,
              lastSaved: prev[type.toLowerCase()].lastSaved,
              error: error.message
            }
          }));
          console.error(`Error saving ${type} data:`, error);
        });
    }, 2000),
    [backendUrl]
  );
  
  // Add WebSocket implementation for real-time data
  const setupWebSocket = useCallback(() => {
    // Only proceed if socket.io-client is available
    if (typeof io !== 'undefined') {
      try {
        const socket = io(backendUrl);
        
        socket.on('connect', () => {
          console.log('Connected to WebSocket');
        });
        
        socket.on('mediapipe_response', (response) => {
          console.log('MediaPipe data response:', response);
        });
        
        return socket;
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        return null;
      }
    }
    
    return null;
  }, [backendUrl]);
  
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
      
      // Reset detection stats when camera starts
      detectionStatsRef.current = {
        face: { count: 0, success: 0, lastFrameDetected: false },
        pose: { count: 0, success: 0, lastFrameDetected: false },
        gesture: { count: 0, success: 0, lastFrameDetected: false }
      };
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
    
    // Cancel any pending animation frame
    if (requestAnimationFrameIdRef.current) {
      cancelAnimationFrame(requestAnimationFrameIdRef.current);
      requestAnimationFrameIdRef.current = null;
    }
    
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
      
      // Cancel any pending animation frame
      if (requestAnimationFrameIdRef.current) {
        cancelAnimationFrame(requestAnimationFrameIdRef.current);
        requestAnimationFrameIdRef.current = null;
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
        
        // Create pose landmarker with optimized settings for better performance
        const poseLandmarker = await window.PoseLandmarker.createFromOptions(visionRef.current, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: "VIDEO",  // Always use VIDEO mode from the start
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
    } else if (poseLandmarkerRef.current) {
      // Close the model if disabled to free resources
      try {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
        addDebugLog('Closed pose landmarker');
      } catch (e) {
        console.error('Error closing pose landmarker:', e);
      }
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
        
        // Create face landmarker with optimized settings
        const faceLandmarker = await window.FaceLandmarker.createFromOptions(visionRef.current, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",  // Always use VIDEO mode from the start
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
    } else if (faceLandmarkerRef.current) {
      // Close the model if disabled to free resources
      try {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
        addDebugLog('Closed face landmarker');
      } catch (e) {
        console.error('Error closing face landmarker:', e);
      }
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
        
        // Create gesture recognizer with optimized settings
        const gestureRecognizer = await window.GestureRecognizer.createFromOptions(visionRef.current, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU'
          },
          runningMode: "VIDEO",  // Always use VIDEO mode from the start
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
    } else if (gestureRecognizerRef.current) {
      // Close the model if disabled to free resources
      try {
        gestureRecognizerRef.current.close();
        gestureRecognizerRef.current = null;
        addDebugLog('Closed gesture recognizer');
      } catch (e) {
        console.error('Error closing gesture recognizer:', e);
      }
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
    
    const canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
    const drawingUtils = drawingUtilsRef.current;
    
    // Function to predict webcam frames
    const predictWebcam = async () => {
      // Get current time for performance measurement
      const startTimeMs = performance.now();
      
      // Only process if video is playing and time has changed
      if (video.readyState >= 2 && lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        
        // Clear the canvas once at the beginning of processing the frame
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Process frames with each enabled detector
        try {
          // Process all detections before drawing anything
          let faceResults = null;
          let poseResults = null;
          let gestureResults = null;
          
          // First collect all results from each detector
          if (faceEnabled && faceLandmarkerRef.current) {
            try {
              detectionStatsRef.current.face.count++;
              faceResults = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
              if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
                detectionStatsRef.current.face.success++;
                detectionStatsRef.current.face.lastFrameDetected = true;
              } else {
                detectionStatsRef.current.face.lastFrameDetected = false;
              }
            } catch (err) {
              console.error('Face detection error:', err);
              detectionStatsRef.current.face.lastFrameDetected = false;
            }
          }
          
          if (poseEnabled && poseLandmarkerRef.current) {
            try {
              detectionStatsRef.current.pose.count++;
              poseResults = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);
              if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
                detectionStatsRef.current.pose.success++;
                detectionStatsRef.current.pose.lastFrameDetected = true;
              } else {
                detectionStatsRef.current.pose.lastFrameDetected = false;
              }
            } catch (err) {
              console.error('Pose detection error:', err);
              detectionStatsRef.current.pose.lastFrameDetected = false;
            }
          }
          
          if (gestureEnabled && gestureRecognizerRef.current) {
            try {
              detectionStatsRef.current.gesture.count++;
              gestureResults = gestureRecognizerRef.current.recognizeForVideo(video, startTimeMs);
              if (gestureResults && gestureResults.landmarks && gestureResults.landmarks.length > 0) {
                detectionStatsRef.current.gesture.success++;
                detectionStatsRef.current.gesture.lastFrameDetected = true;
              } else {
                detectionStatsRef.current.gesture.lastFrameDetected = false;
              }
            } catch (err) {
              console.error('Gesture detection error:', err);
              detectionStatsRef.current.gesture.lastFrameDetected = false;
            }
          }
          
          // Now draw all results in order: face (background), pose (middle), hand gestures (top)
          
          // Draw face landmarks first (if detected)
          if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
            for (const landmarks of faceResults.faceLandmarks) {
              // Draw face mesh with subtle color
              drawingUtils.drawConnectors(
                landmarks,
                window.FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                { color: '#C0C0C040', lineWidth: 0.75 } // More transparent for less interference
              );
              
              // Draw eyes with vibrant colors
              drawingUtils.drawConnectors(
                landmarks,
                window.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                { color: '#FF303090', lineWidth: 1.5 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                window.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                { color: '#30FF3090', lineWidth: 1.5 }
              );
              
              // Draw face oval and lips with clearer colors
              drawingUtils.drawConnectors(
                landmarks,
                window.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                { color: '#E0E0E080', lineWidth: 1.5 }
              );
              drawingUtils.drawConnectors(
                landmarks,
                window.FaceLandmarker.FACE_LANDMARKS_LIPS,
                { color: '#E0A0A080', lineWidth: 1.5 }
              );
            }
            
            // Update face log with blendshapes data (throttled)
            const now = performance.now();
            if (now - lastFaceUpdateTimeRef.current > 200) {
              if (faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
                // Extract blendshapes data from the first detected face
                const blendShapes = faceResults.faceBlendshapes[0];
                
                // Create formatted blendshapes text
                let blendshapesElements = [];
                
                // Add up to 12 of the most significant blendshapes (those with higher values)
                if (blendShapes && blendShapes.categories) {
                  // Sort blendshapes by score in descending order
                  const sortedBlendshapes = [...blendShapes.categories].sort((a, b) => b.score - a.score);
                  
                  // Take the top significant blendshapes with values > 0.02
                  const significantBlendshapes = sortedBlendshapes
                    .filter(shape => shape.score > 0.02)
                    .slice(0, 15);
                  
                  // Create an HTML representation with visual bars
                  const blendshapesHTML = significantBlendshapes
                    .map(shape => {
                      // Format each blendshape with a blue bar representing its value
                      const barWidth = Math.max(1, Math.round(shape.score * 100));
                      return `<div class="blendshape-item">
                                <span class="blendshape-name">${shape.categoryName}</span>
                                <span class="blendshape-value">${shape.score.toFixed(4)}</span>
                                <div class="blendshape-bar" style="width: ${barWidth}%"></div>
                              </div>`;
                    })
                    .join('');
                  
                  // Set HTML content for the face log panel
                  setFaceLog(`<div class="blendshape-container">${blendshapesHTML}</div>`);
                } else {
                  setFaceLog(`Detected ${faceResults.faceLandmarks.length} face(s)<br>No significant expressions`);
                }
                
                // Add this: send face data to backend
                const faceData = {
                  timestamp: new Date().toISOString(),
                  faceLandmarks: faceResults.faceLandmarks,
                  faceBlendshapes: faceResults.faceBlendshapes,
                  metrics: {
                    detectionRate: detectionStatsRef.current.face.success / detectionStatsRef.current.face.count
                  }
                };
                
                sendToBackend('Face', faceData);
              } else {
                setFaceLog(`Detected ${faceResults.faceLandmarks.length} face(s)`);
              }
              lastFaceUpdateTimeRef.current = now;
            }
          } else if (faceEnabled) {
            // Update face log with throttling
            const now = performance.now();
            if (now - lastFaceUpdateTimeRef.current > 200) {
              setFaceLog('No faces detected');
              lastFaceUpdateTimeRef.current = now;
            }
          }
          
          // Draw pose landmarks second (if detected)
          if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
            for (const landmark of poseResults.landmarks) {
              // Draw pose skeleton with high visibility
              drawingUtils.drawConnectors(
                landmark,
                window.PoseLandmarker.POSE_CONNECTIONS,
                { color: '#00FF00', lineWidth: 3 } // Thicker, brighter lines
              );
              
              // Draw pose landmarks with bigger points
              drawingUtils.drawLandmarks(
                landmark,
                { color: '#00FF00', radius: 4 }
              );
            }
            
            // Calculate and display advanced pose metrics
            if (poseResults.landmarks.length > 0) {
              // Get the first person's landmarks (we're analyzing the primary person)
              const landmarks = poseResults.landmarks[0];
              
              // Create metrics array to store various pose measurements
              const poseMetrics = [];
              
              // Calculate joint visibility percentages and confidence scores
              if (landmarks) {
                try {
                  // Calculate posture alignment metrics
                  
                  // Shoulder alignment (horizontal)
                  const leftShoulder = landmarks[11]; // Left shoulder landmark
                  const rightShoulder = landmarks[12]; // Right shoulder landmark
                  
                  // Hip alignment (horizontal)
                  const leftHip = landmarks[23]; // Left hip landmark
                  const rightHip = landmarks[24]; // Right hip landmark
                  
                  // Spine alignment (vertical)
                  const nose = landmarks[0]; // Nose landmark
                  const midShoulder = {
                    x: (leftShoulder.x + rightShoulder.x) / 2,
                    y: (leftShoulder.y + rightShoulder.y) / 2,
                    z: (leftShoulder.z + rightShoulder.z) / 2,
                    visibility: (leftShoulder.visibility + rightShoulder.visibility) / 2
                  };
                  const midHip = {
                    x: (leftHip.x + rightHip.x) / 2,
                    y: (leftHip.y + rightHip.y) / 2,
                    z: (leftHip.z + rightHip.z) / 2,
                    visibility: (leftHip.visibility + rightHip.visibility) / 2
                  };
                  
                  // Calculate shoulder alignment score (0 is perfectly level)
                  // Higher values indicate more tilt
                  const shoulderAngle = Math.abs(Math.atan2(
                    rightShoulder.y - leftShoulder.y,
                    rightShoulder.x - leftShoulder.x
                  ) * (180 / Math.PI));
                  const shoulderAlignmentScore = 1 - Math.min(1, shoulderAngle / 45);
                  
                  // Calculate hip alignment score (0 is perfectly level)
                  const hipAngle = Math.abs(Math.atan2(
                    rightHip.y - leftHip.y,
                    rightHip.x - leftHip.x
                  ) * (180 / Math.PI));
                  const hipAlignmentScore = 1 - Math.min(1, hipAngle / 45);
                  
                  // Calculate spine straightness
                  const spineVector = {
                    x: midHip.x - midShoulder.x,
                    y: midHip.y - midShoulder.y
                  };
                  const spineAngle = Math.abs(Math.atan2(spineVector.x, spineVector.y) * (180 / Math.PI));
                  const spineAlignmentScore = 1 - Math.min(1, spineAngle / 30);
                  
                  // Check if visibility is good enough for reliable metrics
                  const visibilityThreshold = 0.5;
                  const shoulderVisible = leftShoulder.visibility > visibilityThreshold && rightShoulder.visibility > visibilityThreshold;
                  const hipVisible = leftHip.visibility > visibilityThreshold && rightHip.visibility > visibilityThreshold;
                  const noseVisible = nose.visibility > visibilityThreshold;
                  
                  // Only add metrics if the relevant body parts are visible
                  if (shoulderVisible) {
                    poseMetrics.push({
                      name: 'shoulderAlignment',
                      displayName: 'Shoulder Alignment',
                      value: shoulderAlignmentScore,
                      visibility: (leftShoulder.visibility + rightShoulder.visibility) / 2
                    });
                  }
                  
                  if (hipVisible) {
                    poseMetrics.push({
                      name: 'hipAlignment',
                      displayName: 'Hip Alignment',
                      value: hipAlignmentScore,
                      visibility: (leftHip.visibility + rightHip.visibility) / 2
                    });
                  }
                  
                  if (shoulderVisible && hipVisible) {
                    poseMetrics.push({
                      name: 'spineAlignment',
                      displayName: 'Spine Alignment',
                      value: spineAlignmentScore,
                      visibility: (midShoulder.visibility + midHip.visibility) / 2
                    });
                  }
                  
                  // Calculate average confidence across all landmarks
                  const avgVisibility = landmarks.reduce((sum, landmark) => sum + landmark.visibility, 0) / landmarks.length;
                  poseMetrics.push({
                    name: 'poseConfidence',
                    displayName: 'Overall Confidence',
                    value: avgVisibility,
                    visibility: 1.0 // This is a meta-metric, so it's always visible
                  });
                  
                  // Add arm extension metric
                  const leftWrist = landmarks[15]; // Left wrist
                  const rightWrist = landmarks[16]; // Right wrist
                  const leftElbow = landmarks[13]; // Left elbow
                  const rightElbow = landmarks[14]; // Right elbow
                  
                  if (leftWrist.visibility > visibilityThreshold && leftElbow.visibility > visibilityThreshold && leftShoulder.visibility > visibilityThreshold) {
                    const leftArmExtension = calculateJointExtension(leftShoulder, leftElbow, leftWrist);
                    poseMetrics.push({
                      name: 'leftArmExtension',
                      displayName: 'Left Arm Extension',
                      value: leftArmExtension,
                      visibility: Math.min(leftWrist.visibility, leftElbow.visibility, leftShoulder.visibility)
                    });
                  }
                  
                  if (rightWrist.visibility > visibilityThreshold && rightElbow.visibility > visibilityThreshold && rightShoulder.visibility > visibilityThreshold) {
                    const rightArmExtension = calculateJointExtension(rightShoulder, rightElbow, rightWrist);
                    poseMetrics.push({
                      name: 'rightArmExtension',
                      displayName: 'Right Arm Extension',
                      value: rightArmExtension,
                      visibility: Math.min(rightWrist.visibility, rightElbow.visibility, rightShoulder.visibility)
                    });
                  }
                  
                  // Sort metrics by confidence score
                  poseMetrics.sort((a, b) => b.value - a.value);
                  
                  // Generate HTML for pose metrics display
                  const poseMetricsHTML = poseMetrics
                    .filter(metric => metric.visibility > 0.5) // Only show metrics with good visibility
                    .map(metric => {
                      const barWidth = Math.max(1, Math.round(metric.value * 100));
                      const barColor = getMetricColor(metric.name, metric.value);
                      return `<div class="posemetric-item">
                                <span class="posemetric-name">${metric.displayName}</span>
                                <span class="posemetric-value">${metric.value.toFixed(2)}</span>
                                <div class="posemetric-bar" style="width: ${barWidth}%; background-color: ${barColor};"></div>
                              </div>`;
                    })
                    .join('');
                  
                  // Add this: send pose data to backend
                  const poseData = {
                    timestamp: new Date().toISOString(),
                    poseLandmarks: poseResults.landmarks,
                    poseMetrics: poseMetrics,
                    metrics: {
                      detectionRate: detectionStatsRef.current.pose.success / detectionStatsRef.current.pose.count
                    }
                  };
                  
                  sendToBackend('Pose', poseData);
                  
                  // Update pose log
                  const now = performance.now();
                  if (now - lastPoseUpdateTimeRef.current > 200) {
                    setPoseLog(`<div class="posemetric-container">${poseMetricsHTML}</div>`);
                    lastPoseUpdateTimeRef.current = now;
                  }
                } catch (err) {
                  console.error('Error calculating pose metrics:', err);
                  // Fallback to basic pose detection log
                  const now = performance.now();
                  if (now - lastPoseUpdateTimeRef.current > 200) {
                    setPoseLog(`Detected ${poseResults.landmarks.length} person(s)`);
                    lastPoseUpdateTimeRef.current = now;
                  }
                }
              } else {
                // No landmarks found
                const now = performance.now();
                if (now - lastPoseUpdateTimeRef.current > 200) {
                  setPoseLog('No poses detected');
                  lastPoseUpdateTimeRef.current = now;
                }
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
          } else if (poseEnabled) {
            // Update log for no poses
            const now = performance.now();
            if (now - lastPoseUpdateTimeRef.current > 200) {
              setPoseLog('No poses detected');
              lastPoseUpdateTimeRef.current = now;
            }
          }
          
          // Draw gesture recognition last (if detected) - on top layer
          if (gestureResults && gestureResults.landmarks && gestureResults.landmarks.length > 0) {
            for (const landmarks of gestureResults.landmarks) {
              // Draw hand connections with vivid colors
              drawingUtils.drawConnectors(
                landmarks,
                window.GestureRecognizer.HAND_CONNECTIONS,
                { color: '#00FFFF', lineWidth: 3 }
              );
              
              // Draw landmarks with contrast color
              drawingUtils.drawLandmarks(
                landmarks,
                { color: '#FF0000', radius: 4 }
              );
            }
            
            // Update gesture log with throttling
            const now = performance.now();
            if (now - lastGestureUpdateTimeRef.current > 200) {
              if (gestureResults.gestures && 
                  gestureResults.gestures.length > 0 && 
                  gestureResults.gestures[0].length > 0) {
                const gesture = gestureResults.gestures[0][0];
                const hand = gestureResults.handedness && gestureResults.handedness[0] ? 
                          gestureResults.handedness[0][0].displayName : 'Unknown';
                
                // Add this: send gesture data to backend
                const gestureData = {
                  timestamp: new Date().toISOString(),
                  gestures: gestureResults.gestures,
                  handedness: gestureResults.handedness,
                  landmarks: gestureResults.landmarks,
                  metrics: {
                    detectionRate: detectionStatsRef.current.gesture.success / detectionStatsRef.current.gesture.count
                  }
                };
                
                sendToBackend('Gesture', gestureData);
                
                // Then update the log as before
                setGestureLog(`Detected ${gesture.categoryName} (${(gesture.score * 100).toFixed(0)}%) - ${hand} hand`);
              } else {
                setGestureLog('No gestures detected');
              }
              lastGestureUpdateTimeRef.current = now;
            }
          } else if (gestureEnabled) {
            // Update log for no gestures
            const now = performance.now();
            if (now - lastGestureUpdateTimeRef.current > 200) {
              setGestureLog('No gestures detected');
              lastGestureUpdateTimeRef.current = now;
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
      
      // Continue the detection loop if the camera is still running and at least one detection is enabled
      if (cameraRunning && (faceEnabled || poseEnabled || gestureEnabled)) {
        requestAnimationFrameIdRef.current = requestAnimationFrame(predictWebcam);
      }
    };
    
    // Start the detection loop
    requestAnimationFrameIdRef.current = requestAnimationFrame(predictWebcam);
    
    // Cleanup function
    return () => {
      // Cancel the animation frame when the component unmounts or dependencies change
      if (requestAnimationFrameIdRef.current) {
        cancelAnimationFrame(requestAnimationFrameIdRef.current);
        requestAnimationFrameIdRef.current = null;
      }
    };
  }, [cameraRunning, faceEnabled, poseEnabled, gestureEnabled]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Cancel any pending animation frame
      if (requestAnimationFrameIdRef.current) {
        cancelAnimationFrame(requestAnimationFrameIdRef.current);
        requestAnimationFrameIdRef.current = null;
      }
      
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
              <div 
                className="log-content face-blendshapes-log"
                dangerouslySetInnerHTML={{ __html: faceLog }}
              ></div>
            </div>
            
            <div className={`log-panel ${poseEnabled ? 'active' : ''}`}>
              <h3>Pose Detection Log</h3>
              <div 
                className="log-content pose-metrics-log"
                dangerouslySetInnerHTML={{ __html: poseLog }}
              ></div>
            </div>
            
            <div className={`log-panel ${gestureEnabled ? 'active' : ''}`}>
              <h3>Gesture Recognition Log</h3>
              <div className="log-content">{gestureLog}</div>
            </div>
          </div>
          
          {/* Add data saving status indicator */}
          <div className="save-status-panel">
            <h3>Data Saving Status</h3>
            <div className="save-status-content">
              <div className={`save-status-item ${faceEnabled ? 'active' : ''}`}>
                <span className="save-status-type">Face:</span>
                <span className={`save-status-badge ${dataSaveStatus.face.saving ? 'saving' : 
                  dataSaveStatus.face.error ? 'error' : 
                  dataSaveStatus.face.lastSaved ? 'saved' : ''}`}>
                  {dataSaveStatus.face.saving ? 'Saving...' : 
                   dataSaveStatus.face.error ? 'Error' : 
                   dataSaveStatus.face.lastSaved ? 'Saved' : 'Not saved'}
                </span>
                {dataSaveStatus.face.lastSaved && 
                  <span className="save-status-time">
                    Last: {new Date(dataSaveStatus.face.lastSaved).toLocaleTimeString()}
                  </span>
                }
              </div>
              
              <div className={`save-status-item ${poseEnabled ? 'active' : ''}`}>
                <span className="save-status-type">Pose:</span>
                <span className={`save-status-badge ${dataSaveStatus.pose.saving ? 'saving' : 
                  dataSaveStatus.pose.error ? 'error' : 
                  dataSaveStatus.pose.lastSaved ? 'saved' : ''}`}>
                  {dataSaveStatus.pose.saving ? 'Saving...' : 
                   dataSaveStatus.pose.error ? 'Error' : 
                   dataSaveStatus.pose.lastSaved ? 'Saved' : 'Not saved'}
                </span>
                {dataSaveStatus.pose.lastSaved && 
                  <span className="save-status-time">
                    Last: {new Date(dataSaveStatus.pose.lastSaved).toLocaleTimeString()}
                  </span>
                }
              </div>
              
              <div className={`save-status-item ${gestureEnabled ? 'active' : ''}`}>
                <span className="save-status-type">Gesture:</span>
                <span className={`save-status-badge ${dataSaveStatus.gesture.saving ? 'saving' : 
                  dataSaveStatus.gesture.error ? 'error' : 
                  dataSaveStatus.gesture.lastSaved ? 'saved' : ''}`}>
                  {dataSaveStatus.gesture.saving ? 'Saving...' : 
                   dataSaveStatus.gesture.error ? 'Error' : 
                   dataSaveStatus.gesture.lastSaved ? 'Saved' : 'Not saved'}
                </span>
                {dataSaveStatus.gesture.lastSaved && 
                  <span className="save-status-time">
                    Last: {new Date(dataSaveStatus.gesture.lastSaved).toLocaleTimeString()}
                  </span>
                }
              </div>
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

// Helper function to calculate joint extension (0 = fully bent, 1 = fully extended)
const calculateJointExtension = (joint1, joint2, joint3) => {
  // Calculate vectors
  const vector1 = {
    x: joint2.x - joint1.x,
    y: joint2.y - joint1.y,
    z: joint2.z - joint1.z
  };
  
  const vector2 = {
    x: joint3.x - joint2.x,
    y: joint3.y - joint2.y,
    z: joint3.z - joint2.z
  };
  
  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y + vector1.z * vector1.z);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y + vector2.z * vector2.z);
  
  // Calculate dot product
  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
  
  // Calculate angle in radians
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  
  // Normalize to 0-1 range where 1 is straight (180 degrees) and 0 is fully bent
  return 1 - (angle / Math.PI);
};

// Helper function to get appropriate color for metric based on value
const getMetricColor = (metricName, value) => {
  // Different metrics have different "good" ranges
  if (metricName === 'shoulderAlignment' || metricName === 'hipAlignment' || metricName === 'spineAlignment') {
    // For alignment, higher is better (green = good alignment)
    if (value > 0.8) return '#34A853'; // Good - green
    if (value > 0.5) return '#FBBC05'; // Okay - yellow
    return '#EA4335'; // Poor - red
  } else if (metricName === 'poseConfidence') {
    // For confidence, higher is better
    if (value > 0.7) return '#34A853'; // Good confidence - green
    if (value > 0.4) return '#FBBC05'; // Moderate confidence - yellow
    return '#EA4335'; // Poor confidence - red
  } else {
    // Default color scheme (higher is generally better)
    if (value > 0.7) return '#4285F4'; // Blue
    if (value > 0.4) return '#34A853'; // Green
    return '#FBBC05'; // Yellow
  }
};

export default MediaPipeRecognition; 