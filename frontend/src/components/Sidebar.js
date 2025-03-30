import React from 'react';
import './Sidebar.css';

function Sidebar({ isOpen, onNavigate, currentView, onCreateProfile }) {
  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="workspace-title">Trash Detection</div>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-sections">
          <li className="nav-section">
            <span className="section-title">Main</span>
            <ul className="nav-items">
              <li 
                className={`nav-item ${currentView === 'detection' ? 'active' : ''}`}
                onClick={() => onNavigate('detection')}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-text">Live Detection</span>
              </li>
              <li 
                className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`}
                onClick={() => onNavigate('analytics')}
              >
                <span className="nav-icon">📈</span>
                <span className="nav-text">Analytics</span>
              </li>
              <li 
                className={`nav-item ${currentView === 'recognition' ? 'active' : ''}`}
                onClick={() => onNavigate('recognition')}
              >
                <span className="nav-icon">👋</span>
                <span className="nav-text">MediaPipe Recognition</span>
              </li>
              <li className="nav-item">
                <span className="nav-icon">📁</span>
                <span className="nav-text">Saved Results</span>
              </li>
            </ul>
          </li>
          
          <li className="nav-section">
            <span className="section-title">Settings</span>
            <ul className="nav-items">
              <li className="nav-item">
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Model Settings</span>
              </li>
              <li className="nav-item">
                <span className="nav-icon">🎥</span>
                <span className="nav-text">Camera Settings</span>
              </li>
              <li className="nav-item">
                <span className="nav-icon">👤</span>
                <span className="nav-text">User Profile</span>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button className="create-profile-btn" onClick={onCreateProfile}>
          <span className="camera-icon">📷</span>
          <span>Make Profile</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar; 