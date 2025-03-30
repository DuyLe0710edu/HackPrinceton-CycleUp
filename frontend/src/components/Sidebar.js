import React from 'react';
import './Sidebar.css';

function Sidebar({ isOpen, onNavigate, currentView, onCreateProfile }) {
  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="workspace-title">
          <svg className="eco-logo" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4.5 9.5L6 11L10 7V21H14V7L18 11L19.5 9.5L12 2Z" fill="#4CAF50"/>
            <path d="M18 21H6C5.45 21 5 21.45 5 22C5 22.55 5.45 23 6 23H18C18.55 23 19 22.55 19 22C19 21.45 18.55 21 18 21Z" fill="#2E7D32"/>
          </svg>
          EcoGuardian
        </div>
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
              <li 
                className={`nav-item ${currentView === 'stories' ? 'active' : ''}`}
                onClick={() => onNavigate('stories')}
              >
                <span className="nav-icon">📚</span>
                <span className="nav-text">Environmental Stories</span>
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