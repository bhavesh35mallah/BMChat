import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { Dashboard } from './components/Dashboard';
import { ChatBox } from './components/ChatBox';
import { LearningGuide } from './components/LearningGuide';
import './App.css';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'dashboard' | 'guide' | 'auth'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmailPrefill, setAuthEmailPrefill] = useState('');

  const handleSwitchToRegister = (email = '') => {
    if (email) setAuthEmailPrefill(email);
    setAuthMode('register');
  };

  const handleSwitchToLogin = (email = '') => {
    if (email) setAuthEmailPrefill(email);
    setAuthMode('login');
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Connecting to BMChat backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="main-content">
        {activeView === 'guide' ? (
          <LearningGuide />
        ) : !isAuthenticated ? (
          /* Modern Editorial Warm Split Screen */
          <div className="warm-split-container">
            {/* Left Column: Editorial Showcase & Live Chat Mockup */}
            <div className="warm-showcase-column">
              <div className="editorial-tagline">
                <span>BMCHAT 2.0</span>
                <span className="editorial-tagline-line"></span>
              </div>

              <h1 className="editorial-showcase-title">
                Real Conversations.<br />
                Real <span className="highlight-caramel">Connections.</span>
              </h1>
              
              <p className="warm-showcase-desc">
                Experience instant messaging with live typing presence, voice messages, incognito ghost mode, and secure authentication.
              </p>

              {/* Realistic Mini Chat Mockup Window */}
              <div className="warm-mockup-card">
                <div className="warm-mockup-header">
                  <div className="mockup-team-avatar">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                  </div>
                  <div className="warm-mockup-user">
                    <div className="warm-mockup-name">Team Discussion</div>
                    <div className="warm-mockup-status">
                      <span className="mockup-online-dot"></span> 3 members active
                    </div>
                  </div>
                  <div className="mockup-preview-pill">
                    <span className="preview-dot"></span>
                    <span>Live Preview</span>
                  </div>
                </div>

                <div className="warm-mockup-body">
                  <div className="mockup-bubble-row">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80"
                      alt="Sarah"
                      className="mockup-sender-avatar"
                    />
                    <div className="mockup-bubble mockup-received">
                      <span className="mockup-sender">Sarah</span>
                      <p>Hey team! Realtime WebSocket messaging is live on BMChat 🚀</p>
                      <span className="mockup-time">10:41 AM</span>
                    </div>
                  </div>

                  <div className="mockup-bubble mockup-sent">
                    <p>Super fast! Typing presence and voice recordings work seamlessly.</p>
                    <span className="mockup-time">10:42 AM <span className="check-marks">✓✓</span></span>
                  </div>

                  <div className="mockup-typing-pill">
                    <div className="mockup-typing-avatar">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5"/>
                      </svg>
                    </div>
                    <span className="typing-text">Alex is typing</span>
                    <span className="typing-dots">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Three Value Bullets with Soft Peach Circles */}
              <div className="warm-perks-row">
                <div className="warm-perk-item">
                  <div className="warm-perk-icon-circle">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M13 2L3 14h8l-1 8 11-12h-8l1-8z"/>
                    </svg>
                  </div>
                  <div className="warm-perk-content">
                    <strong>Zero Latency</strong>
                    <p>Real-time Socket.io engine</p>
                  </div>
                </div>

                <div className="warm-perk-item">
                  <div className="warm-perk-icon-circle">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div className="warm-perk-content">
                    <strong>Secure Auth</strong>
                    <p>Email OTP code &amp; password</p>
                  </div>
                </div>

                <div className="warm-perk-item">
                  <div className="warm-perk-icon-circle">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
                      <circle cx="9" cy="10" r="1.2" fill="currentColor"/>
                      <circle cx="15" cy="10" r="1.2" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="warm-perk-content">
                    <strong>Ghost Mode</strong>
                    <p>Incognito typing whenever needed</p>
                  </div>
                </div>
              </div>

              {/* Handwritten signature accent */}
              <div className="editorial-handwritten-note">
                <span>Better Chats, Better Moments</span>
                <svg className="signature-curve" viewBox="0 0 170 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 9C42 2 124 2 168 11" stroke="#37598c" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* Right Column: Editorial Auth Card */}
            <div className="warm-auth-column">
              <div className="warm-auth-card">
                <div className="warm-card-header">
                  <div className="editorial-logo-badge">
                    <div className="editorial-icon-box">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 9h-4c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1zm2-4H8c-.55 0-1-.45-1-1s.45-1 1-1h8c.55 0 1 .45 1 1s-.45 1-1 1zm-4 8H8c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1z"/>
                      </svg>
                    </div>
                    <span className="editorial-brand-name">BM<span className="editorial-chat-accent">Chat</span></span>
                  </div>

                  <h2 className="warm-card-title editorial-serif-title">
                    {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
                  </h2>
                  <p className="warm-card-subtitle">
                    {authMode === 'login'
                      ? 'Sign in to access your chat messages and contacts'
                      : 'Sign up in seconds to start chatting with your team'}
                  </p>
                </div>

                {/* Segmented Switcher */}
                <div className="warm-segmented-nav">
                  <button
                    type="button"
                    className={`warm-nav-btn ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => setAuthMode('login')}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={`warm-nav-btn ${authMode === 'register' ? 'active' : ''}`}
                    onClick={() => setAuthMode('register')}
                  >
                    Create Account
                  </button>
                </div>

                {/* Forms */}
                <div className="warm-card-body">
                  {authMode === 'login' ? (
                    <LoginForm
                      onSwitchToRegister={handleSwitchToRegister}
                      initialEmail={authEmailPrefill}
                    />
                  ) : (
                    <RegisterForm
                      onSwitchToLogin={handleSwitchToLogin}
                      initialEmail={authEmailPrefill}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Botanical decorative leaves in bottom corners */}
            <div className="botanical-leaf-left" aria-hidden="true">
              <svg viewBox="0 0 180 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M-10 220C20 160 55 125 110 60" stroke="#365347" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
                <path d="M25 180C5 160 2 135 22 130C42 125 45 155 25 180Z" fill="#3f6554" opacity="0.8"/>
                <path d="M55 150C70 125 95 120 100 140C105 160 80 170 55 150Z" fill="#325043" opacity="0.85"/>
                <path d="M60 120C40 100 40 70 60 65C80 60 85 90 60 120Z" fill="#4d7764" opacity="0.75"/>
                <path d="M90 95C110 75 135 70 140 90C145 110 120 120 90 95Z" fill="#3f6554" opacity="0.85"/>
                <path d="M95 65C85 40 95 15 115 10C135 5 135 35 95 65Z" fill="#4d7764" opacity="0.8"/>
                <path d="M110 60C130 35 155 30 165 50C175 70 145 85 110 60Z" fill="#325043" opacity="0.85"/>
              </svg>
            </div>

            <div className="botanical-leaf-right" aria-hidden="true">
              <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M210 240C170 175 145 130 80 60" stroke="#d5c7b3" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
                <path d="M165 195C185 175 195 145 175 138C155 130 145 160 165 195Z" fill="#e8dcce" opacity="0.8"/>
                <path d="M130 155C115 130 90 125 85 145C80 165 105 175 130 155Z" fill="#dfd0bf" opacity="0.85"/>
                <path d="M125 125C145 105 145 75 125 70C105 65 100 95 125 125Z" fill="#ebdcd0" opacity="0.75"/>
                <path d="M95 95C75 75 50 70 45 90C40 110 65 120 95 95Z" fill="#dfd0bf" opacity="0.85"/>
                <path d="M90 60C100 35 90 10 70 5C50 0 50 30 90 60Z" fill="#e8dcce" opacity="0.75"/>
                <path d="M80 50C60 25 35 20 25 40C15 60 45 75 80 50Z" fill="#d8c5b0" opacity="0.8"/>
              </svg>
            </div>
          </div>
        ) : activeView === 'dashboard' ? (
          <Dashboard />
        ) : (
          <ChatBox />
        )}
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
