import React, { useEffect, useRef } from 'react';
import MediaPipeRecognition from './MediaPipeRecognition';
import mediaStateService from '../services/mediaStateService';

/**
 * MediaPipeWrapper
 * 
 * This component wraps MediaPipeRecognition and handles communication
 * with the mediaStateService without modifying the original component.
 */
const MediaPipeWrapper = (props) => {
  // Track mount status
  const isMountedRef = useRef(true);
  
  // Track camera status through DOM observation
  useEffect(() => {
    // Function to check camera status
    const checkCameraStatus = () => {
      // Look for video element with camera feed
      const videoElement = document.querySelector('.input-video');
      if (videoElement) {
        // If video has srcObject, camera is running
        const isRunning = !!videoElement.srcObject;
        mediaStateService.updateCameraStatus(isRunning);
      }
    };
    
    // Set up observer to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      checkCameraStatus();
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Check initial status
    setTimeout(checkCameraStatus, 1000);
    
    // Poll for updates every 2 seconds as backup
    const interval = setInterval(checkCameraStatus, 2000);
    
    return () => {
      isMountedRef.current = false;
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
  
  // Track detection stats through DOM observation
  useEffect(() => {
    // Function to check detection statistics
    const checkDetectionStats = () => {
      // Look for the stats elements
      const faceElement = document.querySelector('.stat-label.face + .green-stats-circle');
      const poseElement = document.querySelector('.stat-label.pose + .green-stats-circle'); 
      const gestureElement = document.querySelector('.stat-label.gesture + .green-stats-circle');
      const fpsElement = document.querySelector('.green-stats-circle-fps');
      
      if (faceElement && poseElement && gestureElement) {
        const stats = {
          face: parseInt(faceElement.textContent) || 0,
          pose: parseInt(poseElement.textContent) || 0,
          gesture: parseInt(gestureElement.textContent) || 0,
          fps: fpsElement ? parseInt(fpsElement.textContent) || 0 : 0
        };
        
        mediaStateService.updateDetectionStats(stats);
      }
    };
    
    // Set up observer to watch for DOM changes in detection stats
    const statsObserver = new MutationObserver((mutations) => {
      checkDetectionStats();
    });
    
    // Start observing after a delay to ensure the DOM is ready
    const startObservation = () => {
      const statsContainer = document.querySelector('.detection-stats');
      if (statsContainer) {
        statsObserver.observe(statsContainer, { 
          childList: true, 
          subtree: true,
          characterData: true,
          characterDataOldValue: true
        });
        checkDetectionStats();
      } else {
        // Try again if container not found
        setTimeout(startObservation, 1000);
      }
    };
    
    // Start initial observation with delay
    setTimeout(startObservation, 1000);
    
    // Poll for updates every second as backup
    const statsInterval = setInterval(checkDetectionStats, 1000);
    
    return () => {
      statsObserver.disconnect();
      clearInterval(statsInterval);
    };
  }, []);
  
  // Track activity insights through DOM observation
  useEffect(() => {
    // Function to check activity insights
    const checkActivityInsights = () => {
      const insightElements = document.querySelectorAll('.insight-item');
      if (insightElements.length > 0) {
        const insights = Array.from(insightElements).map(el => {
          const timeEl = el.querySelector('.insight-time');
          const textEl = el.querySelector('.insight-text');
          return {
            time: timeEl ? timeEl.textContent : new Date().toLocaleTimeString(),
            text: textEl ? textEl.textContent : ''
          };
        });
        
        mediaStateService.updateActivityInsights(insights);
      }
    };
    
    // Poll for activity insight updates
    const insightsInterval = setInterval(checkActivityInsights, 2000);
    
    return () => {
      clearInterval(insightsInterval);
    };
  }, []);

  return <MediaPipeRecognition {...props} />;
};

export default MediaPipeWrapper; 