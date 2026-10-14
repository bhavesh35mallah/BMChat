import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  IconShield,
  IconGhost,
  IconChat,
  IconBook,
  IconSun,
  IconMoon,
  IconLogOut,
} from './Icons';

export const Navbar = ({ activeView, setActiveView }) => {
  const { user, isAuthenticated, logout, serverStatus } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  let onlineUsers = [];
  let ghostMode = false;
  let toggleGhostMode = () => { };
  try {
    const socketData = useSocket();
    onlineUsers = socketData?.onlineUsers || [];
    ghostMode = socketData?.ghostMode || false;
    toggleGhostMode = socketData?.toggleGhostMode || (() => { });
  } catch (e) {
    // If SocketProvider isn't loaded yet
  }

  return (
    <header className="navbar">
      <div className="nav-container">
        <div
          className="brand"
          onClick={() => setActiveView(isAuthenticated ? 'chat' : 'auth')}
        >
          <div className="brand-icon">
            <img src="/logo.png" alt="logo" />
          </div>
          <div className="brand-text-col">
            <div className="brand-title">BMChat</div>
            <div className="brand-subtitle">Chat &bull; Connect &bull; Share</div>
          </div>
        </div>

        {/* Center Editorial Navigation Links */}
        {!isAuthenticated && (
          <nav className="nav-center-links">
            <button
              type="button"
              className={`nav-link-item ${activeView !== 'guide' ? 'active' : ''}`}
              onClick={() => setActiveView('auth')}
            >
              Home
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => {
                const el = document.querySelector('.warm-showcase-column');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Features
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => setActiveView('guide')}
            >
              About
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => setActiveView('guide')}
            >
              Help
            </button>
          </nav>
        )}

        <div className="nav-actions">
          {/* Server status pill */}
          <div
            className={`status-pill ${serverStatus === 'online' ? 'status-online' : 'status-offline'
              }`}
            title={
              serverStatus === 'online'
                ? 'Backend API and Socket.io active on :5000'
                : 'Backend is offline'
            }
          >
            <span className="status-dot"></span>
            <span className="status-pill-text">{serverStatus === 'online' ? 'Live' : 'Offline'}</span>
          </div>

          {/* Authenticated Navigation Buttons */}
          {isAuthenticated && (
            <>
              <button
                className={`nav-btn ghost-toggle-btn ${ghostMode ? 'nav-btn-ghost-active' : ''}`}
                onClick={toggleGhostMode}
                title={ghostMode ? 'Ghost Mode Active: Typing indicators & active presence hidden' : 'Enable Ghost Mode: Incognito typing and status'}
              >
                <span className="icon">
                  <IconGhost size={16} />
                </span>
                <span className="nav-btn-text">{ghostMode ? 'Ghost: ON' : 'Ghost: OFF'}</span>
              </button>

              <button
                className={`nav-btn ${activeView === 'chat' ? 'nav-btn-active' : ''}`}
                onClick={() => setActiveView('chat')}
                title="Open Live Chat"
              >
                <span className="icon">
                  <IconChat size={16} />
                </span>
                <span className="nav-btn-text">Chat</span>
                {onlineUsers.length > 0 && (
                  <span className="badge-mini-count">{onlineUsers.length}</span>
                )}
              </button>

              <button
                className={`nav-btn ${activeView === 'dashboard' ? 'nav-btn-active' : ''}`}
                onClick={() => setActiveView('dashboard')}
                title="View Profile & Dashboard"
              >
                <div className="user-avatar-mini">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="nav-avatar-img" />
                  ) : (
                    user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                <span className="user-name-label">{user?.name}</span>
              </button>
            </>
          )}

          {/* Guide toggle button */}
          <button
            className={`nav-btn ${activeView === 'guide' ? 'nav-btn-active' : ''}`}
            onClick={() =>
              setActiveView(
                activeView === 'guide'
                  ? isAuthenticated
                    ? 'chat'
                    : 'auth'
                  : 'guide'
              )
            }
            title="Interactive Guide"
          >
            <span className="icon">
              <IconBook size={16} />
            </span>
            <span className="nav-btn-text">Guide</span>
          </button>

          {/* Theme Switcher */}
          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            <span className="theme-toggle-icon-wrap">
              {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
            </span>
            <span className="nav-btn-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* Sign Out */}
          {isAuthenticated && (
            <button
              className="nav-btn btn-danger-ghost"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <IconLogOut size={16} />
              <span className="nav-btn-text">Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
