import React from 'react';
import './DetectionResults.css';

function DetectionResults({ detections }) {
  // Count items by class
  const countByClass = detections.reduce((acc, detection) => {
    const className = detection.class;
    acc[className] = (acc[className] || 0) + 1;
    return acc;
  }, {});

  // Get all possible classes
  const allClasses = ['glass', 'metal', 'paper', 'plastic', 'undefined'];
  
  // Get the most detected class
  const getMostDetectedClass = () => {
    let maxClass = null;
    let maxCount = 0;
    
    for (const [className, count] of Object.entries(countByClass)) {
      if (count > maxCount) {
        maxCount = count;
        maxClass = className;
      }
    }
    
    return maxClass;
  };
  
  const mostDetectedClass = getMostDetectedClass();
  
  return (
    <div className="detection-results">
      <h2>Detection Results</h2>
      
      <div className="results-summary">
        <div className="total-count">
          <span className="count-number">{detections.length}</span>
          <span className="count-label">Items Detected</span>
        </div>
        
        {mostDetectedClass && (
          <div className="most-detected">
            <p>Most detected: <span className={`highlight ${mostDetectedClass}`}>{mostDetectedClass}</span></p>
          </div>
        )}
        
        <ul className="class-distribution">
          {allClasses.map(className => (
            <li key={className} className={`class-item ${className}`}>
              <div className="class-color-indicator"></div>
              <span className="class-name">{className}</span>
              <span className="class-count">{countByClass[className] || 0}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="detection-table">
        <h3>All Detections</h3>
        <table>
          <thead>
            <tr>
              <th>Item Type</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {detections.length > 0 ? (
              detections.map((detection, index) => (
                <tr key={index} className={detection.class}>
                  <td>
                    <div className="class-info">
                      <div className="class-color-dot"></div>
                      <span>{detection.class}</span>
                    </div>
                  </td>
                  <td>{(detection.confidence * 100).toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="no-detections">
                  No items detected yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DetectionResults; 