import React from 'react';
import './Header.css';

function Header({ toggleSidebar, userProfile }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <span className="menu-icon">☰</span>
        </button>
        <h1 className="app-title">Trash Detection</h1>
      </div>
      <div className="header-center">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search..." />
        </div>
      </div>
      <div className="header-right">
        <div className="user-button">
          {userProfile ? (
            <img 
              src={userProfile} 
              alt="User Profile" 
              className="user-profile-image" 
            />
          ) : (
            <div className="user-avatar">TD</div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header; 