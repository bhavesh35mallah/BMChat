import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('mern_auth_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

  // Verify server connectivity and fetch profile if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Check Backend Health
      const health = await authAPI.checkHealth();
      if (health.status === 'ok') {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }

      // 2. Validate saved token if present
      const savedToken = localStorage.getItem('mern_auth_token');
      if (savedToken) {
        try {
          const res = await authAPI.getMe(savedToken);
          if (res.success && res.user) {
            setUser(res.user);
            setToken(savedToken);
          } else {
            // Invalid or expired token
            localStorage.removeItem('mern_auth_token');
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.warn('Saved token expired or invalid:', err.message);
          localStorage.removeItem('mern_auth_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Register function
  const register = async (name, email, password, bio) => {
    try {
      const res = await authAPI.register({ name, email, password, bio });
      if (res.token && res.user) {
        localStorage.setItem('mern_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
      return { success: true, message: res.message || 'Registration successful!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Login function (supports email or mobile number with password)
  const login = async (credentials, password) => {
    try {
      const payload =
        typeof credentials === 'object'
          ? credentials
          : { identifier: credentials, password };
      const res = await authAPI.login(payload);
      if (res.token && res.user) {
        localStorage.setItem('mern_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
      return { success: true, message: res.message || 'Login successful!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Send OTP for Registration (supports phone or email)
  const sendRegisterOTP = async (arg1, arg2) => {
    try {
      const payload =
        typeof arg1 === 'object'
          ? arg1
          : { name: arg1, email: arg2 };
      const res = await authAPI.sendRegisterOTP(payload);
      return {
        success: true,
        message: res.message,
        devOtp: res.devOtp,
        deliveryType: res.deliveryType || 'email',
        target: res.target,
        delivered: res.delivered ?? res.emailDelivered,
        mode: res.mode,
        error: res.error ?? res.emailError,
      };
    } catch (err) {
      return {
        success: false,
        alreadyRegistered: !!err.alreadyRegistered,
        message: err.message,
      };
    }
  };

  // Verify OTP and complete Registration (supports phone or email)
  const verifyRegisterOTP = async (arg1, arg2, arg3) => {
    try {
      let payload;
      if (typeof arg1 === 'object') {
        payload = arg1;
      } else {
        payload = { identifier: arg1, otp: arg2, password: arg3 };
      }
      const res = await authAPI.verifyRegisterOTP(payload);
      if (res.token && res.user) {
        localStorage.setItem('mern_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
      return { success: true, message: res.message || 'Registration successful!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Send OTP for Login (supports phone or email)
  const sendLoginOTP = async (target) => {
    try {
      const payload =
        typeof target === 'object'
          ? target
          : { identifier: target };
      const res = await authAPI.sendLoginOTP(payload);
      return {
        success: true,
        message: res.message,
        devOtp: res.devOtp,
        deliveryType: res.deliveryType || 'email',
        target: res.target,
        delivered: res.delivered ?? res.emailDelivered,
        mode: res.mode,
        error: res.error ?? res.emailError,
      };
    } catch (err) {
      return {
        success: false,
        notRegistered: !!err.notRegistered || !!err.notFound,
        message: err.message,
      };
    }
  };

  // Verify OTP and Login (supports phone or email)
  const verifyLoginOTP = async (target, otp) => {
    try {
      const payload =
        typeof target === 'object'
          ? target
          : { identifier: target, otp };
      const res = await authAPI.verifyLoginOTP(payload);
      if (res.token && res.user) {
        localStorage.setItem('mern_auth_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
      return { success: true, message: res.message || 'Login successful!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('mern_auth_token');
    setToken(null);
    setUser(null);
  };

  // Update profile
  const updateProfile = async (data) => {
    if (!token) return { success: false, message: 'Not authenticated' };
    try {
      const res = await authAPI.updateProfile(token, data);
      if (res.success && res.user) {
        setUser(res.user);
      }
      return { success: true, message: res.message || 'Profile updated!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Re-fetch current user profile
  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await authAPI.getMe(token);
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Refresh error:', err.message);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    serverStatus,
    register,
    login,
    sendRegisterOTP,
    verifyRegisterOTP,
    sendLoginOTP,
    verifyLoginOTP,
    logout,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
