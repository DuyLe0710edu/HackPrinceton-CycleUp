import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [activeStory, setActiveStory] = useState(null);

  // Particle animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = `rgba(${40 + Math.random() * 30}, ${200 + Math.random() * 55}, ${
          70 + Math.random() * 40
        }, ${0.3 + Math.random() * 0.4})`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        else if (this.x < 0) this.x = canvas.width;

        if (this.y > canvas.height) this.y = 0;
        else if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }

      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    init();
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  // Stories data
  const stories = {
    children: {
      title: "The Forest Classroom",
      content: [
        "In a world where screens replaced trees, a young girl named Luna discovered an AI companion that showed her the wonders of nature she had never seen.",
        "Together, they explored virtual forests while Luna planted real seeds in her garden. For every digital lesson completed, a real tree grew in her heart.",
        "As the seasons changed, so did Luna. She began teaching other children, creating a chain of knowledge that spread like roots beneath the soil.",
        "Today, over 10,000 children like Luna are learning to hear the whispers of the Earth, building a generation that breathes with the rhythm of nature."
      ],
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="story-icon"
        >
          <path d="M18 8a6 6 0 0 1-6 6c-3.33 0-6-2-6-6a6 6 0 1 1 12 0v0Z" />
          <path d="M18 8c0 4-1.5 8-6 8s-6-4-6-8" />
          <path d="M12 14c-3.34 0-6 1.34-6 3v3h12v-3c0-1.66-2.66-3-6-3Z" />
        </svg>
      )
    },
    hours: {
      title: "Time of Growth",
      content: [
        "Every second spent learning is a seed planted in fertile ground. Our AI teachers don't measure time by ticking clocks, but by moments of understanding.",
        "A child in Tokyo learns about coral reefs while another in Brazil discovers how rainforests breathe. Different continents, connected by knowledge flowing like water.",
        "Over 50,000 hours of learning have created ripples across communities worldwide, transforming silent screens into vibrant conversations about our planet.",
        "Each hour isn't just time spent - it's potential realized, as young minds see themselves not as separate from nature, but as its guardians and storytellers."
      ],
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="story-icon"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    projects: {
      title: "Seeds of Change",
      content: [
        "What begins as a single idea can blossom into a community garden, a clean riverbank, or a bustling bird sanctuary.",
        "Our AI teachers guide children to observe local problems and imagine creative solutions. Virtual lessons become tangible actions as students collaborate with neighbors and friends.",
        "From solar-powered community centers to microplastic collection systems, young innovators have launched over 500 eco-projects worldwide.",
        "Each project is a story being written by small hands with big dreams - proof that education coupled with action creates the most beautiful kind of change."
      ],
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="story-icon"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9 14 9.24 12.24 11 10" />
        </svg>
      )
    }
  };

  // Close story modal
  const closeStory = () => {
    setActiveStory(null);
  };

  return (
    <div className="landing-page">
      {/* Canvas for particle effect */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Main content */}
      <div className="landing-content">
        <div className="landing-center">
          {/* Logo and glowing title */}
          <div className="landing-logo-container animate-fade-in">
            <div className="rotating-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="180"
                height="180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
                <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
                <path d="m14 16-3 3 3 3" />
                <path d="M8.293 13.596 7.196 9.5 3.1 10.598" />
                <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843" />
                <path d="m13.378 9.633 4.096 1.098 1.097-4.096" />
              </svg>
            </div>

            <div className="title-container">
              <h1 className="main-title">
                <span className="cycle-text animate-pulse">Cycle</span>
                <span className="up-text">Up</span>
              </h1>

              <p className="subtitle animate-slide-up">
                Empowering children with AI-driven environmental education
              </p>
              
              <p className="description animate-slide-up">
                Where AI teachers nurture young minds to develop environmental consciousness
              </p>
            </div>
          </div>

          {/* Floating leaves */}
          <div className="leaves-container">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="floating-leaf"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${Math.random() * 20 + 15}s`,
                  transform: `scale(${Math.random() * 0.5 + 0.5})`,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={Math.random() * 30 + 20}
                  height={Math.random() * 30 + 20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9 14 9.24 12.24 11 10" />
                </svg>
              </div>
            ))}
          </div>

          {/* Call to action with wave effect */}
          <div className="cta-container animate-slide-up">
            <WaveButton onClick={handleGetStarted} />
          </div>

          {/* Stats */}
          <div className="stats-container animate-fade-in">
            <div className="stat-item" onClick={() => setActiveStory('children')}>
              <p className="stat-value">10K+</p>
              <p className="stat-label">Children Educated</p>
              <div className="stat-click-hint">Click to read story</div>
            </div>
            <div className="stat-item" onClick={() => setActiveStory('hours')}>
              <p className="stat-value">50K+</p>
              <p className="stat-label">Learning Hours</p>
              <div className="stat-click-hint">Click to read story</div>
            </div>
            <div className="stat-item" onClick={() => setActiveStory('projects')}>
              <p className="stat-value">500+</p>
              <p className="stat-label">Eco Projects</p>
              <div className="stat-click-hint">Click to read story</div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Modal */}
      {activeStory && (
        <div className="story-modal-overlay" onClick={closeStory}>
          <div className="story-modal" onClick={(e) => e.stopPropagation()}>
            <button className="story-close-btn" onClick={closeStory}>×</button>
            <div className="story-header">
              {stories[activeStory].icon}
              <h2 className="story-title">{stories[activeStory].title}</h2>
            </div>
            <div className="story-content">
              {stories[activeStory].content.map((paragraph, index) => (
                <p key={index} className="story-paragraph" style={{ animationDelay: `${0.3 + index * 0.15}s` }}>
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="story-footer">
              <button className="story-continue-btn" onClick={closeStory}>
                Continue the Journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wave Button Component
function WaveButton({ onClick }) {
  const [waves, setWaves] = useState([]);
  const buttonRef = useRef(null);
  const nextId = useRef(0);

  const handleClick = (e) => {
    if (!buttonRef.current) return;

    // Get click position relative to button
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add new wave
    setWaves((prev) => [...prev, { id: nextId.current, x, y }]);
    nextId.current += 1;

    // Remove wave after animation completes
    setTimeout(() => {
      setWaves((prev) => prev.filter((wave) => wave.id !== nextId.current - 1));
    }, 2000);

    // Call the click handler
    if (onClick) onClick();
  };

  return (
    <div className="wave-button-container">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="join-button"
      >
        Start Learning
      </button>

      {/* Waves */}
      {waves.map((wave) => (
        <div
          key={wave.id}
          className="wave-effect"
          style={{
            left: wave.x,
            top: wave.y,
          }}
        />
      ))}
    </div>
  );
} 