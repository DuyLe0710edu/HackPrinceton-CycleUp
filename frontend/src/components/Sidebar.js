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
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="12" width="4" height="8" rx="1" fill="#4CAF50"/>
                  <rect x="10" y="8" width="4" height="12" rx="1" fill="#4CAF50"/>
                  <rect x="16" y="4" width="4" height="16" rx="1" fill="#4CAF50"/>
                  <path d="M3 19H21" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="nav-text">Live Detection</span>
              </li>
              <li 
                className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`}
                onClick={() => onNavigate('analytics')}
              >
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 16L8 11L13 16L21 8" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 8H21V13" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="20" x2="21" y2="20" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="nav-text">Analytics</span>
              </li>
              <li 
                className={`nav-item ${currentView === 'recognition' ? 'active' : ''}`}
                onClick={() => onNavigate('recognition')}
              >
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8C6 11.3137 8.68629 14 12 14" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M14 16L18 20L22 16" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 12V20" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 18C8 19.1046 7.10457 20 6 20C4.89543 20 4 19.1046 4 18C4 16.8954 4.89543 16 6 16C7.10457 16 8 16.8954 8 18Z" fill="#81C784"/>
                </svg>
                <span className="nav-text">MediaPipe Recognition</span>
              </li>
              <li 
                className={`nav-item ${currentView === 'stories' ? 'active' : ''}`}
                onClick={() => onNavigate('stories')}
              >
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 19.5V4.5C4 4.22386 4.22386 4 4.5 4H19.5C19.7761 4 20 4.22386 20 4.5V19.5C20 19.7761 19.7761 20 19.5 20H4.5C4.22386 20 4 19.7761 4 19.5Z" stroke="#4CAF50" strokeWidth="1.5"/>
                  <path d="M9 8H15" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M9 12H15" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M9 16H13" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 7C8 5 8 3 8 3C8 3 8 5 10 7C12 9 12 11 12 11C12 11 12 9 14 7C16 5 16 3 16 3C16 3 16 5 18 7" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="nav-text">Environmental Stories</span>
              </li>
              <li 
                className={`nav-item ${currentView === 'aiassistant' ? 'active' : ''}`}
                onClick={() => onNavigate('aiassistant')}
              >
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4CAF50" strokeWidth="1.5"/>
                  <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="#4CAF50" strokeWidth="1.5"/>
                  <path d="M4.93 4.93L8.5 8.5" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M19.07 4.93L15.5 8.5" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M15.5 15.5L19.07 19.07" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8.5 15.5L4.93 19.07" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="nav-text">Kindergarten Assistant</span>
              </li>
              <li className="nav-item">
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 8C4 6.89543 4.89543 6 6 6H18C19.1046 6 20 6.89543 20 8V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V8Z" stroke="#4CAF50" strokeWidth="1.5"/>
                  <path d="M8 6V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V6" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M7 14L10 17L17 10" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="nav-text">Saved Results</span>
              </li>
            </ul>
          </li>
          
          <li className="nav-section">
            <span className="section-title">Settings</span>
            <ul className="nav-items">
              <li className="nav-item">
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#4CAF50" strokeWidth="1.5"/>
                  <path d="M19.4 15C19.1277 15.8031 19.2583 16.6718 19.75 17.4L19.81 17.49C20.2082 17.9875 20.4099 18.6285 20.3728 19.2793C20.3358 19.9301 20.0622 20.5428 19.6 21C19.1402 21.4609 18.5295 21.7395 17.879 21.7798C17.2285 21.82 16.5871 21.6202 16.08 21.23L16 21.17C15.2718 20.6783 14.4031 20.5477 13.6 20.82C12.8126 21.0811 12.1697 21.6517 11.85 22.39L11.8 22.55C11.586 23.1661 11.1484 23.6783 10.5775 23.9797C10.0066 24.281 9.34442 24.349 8.72 24.17C8.08119 23.9886 7.53396 23.5774 7.17937 23.0188C6.82478 22.4602 6.68608 21.7926 6.79 21.14L6.84 20.96C7.1123 20.1569 6.98166 19.2882 6.49 18.56L6.43 18.47C5.94085 17.96 5.67216 17.2773 5.70917 16.5769C5.74618 15.8765 6.08223 15.2213 6.62 14.76C7.08475 14.3048 7.69566 14.0309 8.34613 13.9939C8.99661 13.9569 9.63761 14.1591 10.14 14.55L10.22 14.61C10.9482 15.1017 11.8169 15.2323 12.62 14.96C13.4074 14.6989 14.0503 14.1283 14.37 13.39L14.42 13.23C14.634 12.6139 15.0716 12.1017 15.6425 11.8003C16.2134 11.499 16.8756 11.431 17.5 11.61C18.1326 11.7958 18.6739 12.2058 19.0254 12.7608C19.3769 13.3158 19.5159 13.9786 19.42 14.63L19.37 14.81C19.0977 15.6131 19.2284 16.4818 19.72 17.21" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="nav-text">Model Settings</span>
              </li>
              <li className="nav-item">
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z" stroke="#4CAF50" strokeWidth="1.5"/>
                  <path d="M13 6H17C17.5304 6 18.0391 6.21071 18.4142 6.58579C18.7893 6.96086 19 7.46957 19 8V18C19 18.5304 18.7893 19.0391 18.4142 19.4142C18.0391 19.7893 17.5304 20 17 20H7C6.46957 20 5.96086 19.7893 5.58579 19.4142C5.21071 19.0391 5 18.5304 5 18V13" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="6" cy="6" r="2" fill="#81C784"/>
                </svg>
                <span className="nav-text">Camera Settings</span>
              </li>
              <li className="nav-item">
                <svg className="nav-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="5" stroke="#4CAF50" strokeWidth="1.5"/>
                  <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 13L12 21" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M17 17H7" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="nav-text">User Profile</span>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button className="create-profile-btn" onClick={onCreateProfile}>
          <svg className="camera-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6H16L15.5 4.5C15.1888 3.76692 14.4203 3.26487 13.6 3.23H10.4C9.57975 3.26487 8.8112 3.76692 8.5 4.5L8 6H5C3.343 6 2 7.343 2 9V18C2 19.657 3.343 21 5 21H19C20.657 21 22 19.657 22 18V9C22 7.343 20.657 6 19 6Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="white" strokeWidth="1.5"/>
          </svg>
          <span>Make Profile</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar; 