import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <p>Trash Detection System &copy; {new Date().getFullYear()}</p>
      <p>Built with YOLOv8 and React</p>
    </footer>
  );
}

export default Footer; 