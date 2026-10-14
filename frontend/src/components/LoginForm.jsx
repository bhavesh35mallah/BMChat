import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconKey,
  IconArrowLeft,
  IconMailCheck,
  IconRefresh,
} from './Icons';

export const LoginForm = ({ onSwitchToRegister, initialEmail = '' }) => {
  const { login, sendLoginOTP, verifyLoginOTP } = useAuth();

  // authMethod: 'otp' (mockup default) | 'password'
  const [authMethod, setAuthMethod] = useState('otp');

  // OTP flow state (step: 'email' | 'verify')
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [isAccountNotFound, setIsAccountNotFound] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState({ delivered: true, error: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Digit box handlers
  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (error) setError('');
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtpDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const otpCode = otpDigits.join('');

  // 1. Password Login (Primary classic method)
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setIsAccountNotFound(false);

    const res = await login({ email: emailTrimmed, password });
    setIsSubmitting(false);
    if (!res.success) {
      setError(res.message || 'Login failed. Please check your credentials.');
      if (res.message && res.message.toLowerCase().includes('not found')) {
        setIsAccountNotFound(true);
      }
    }
  };

  // 2. Send OTP for Login
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setError('Please enter your email address.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setIsAccountNotFound(false);
    setSuccessMsg('');

    const res = await sendLoginOTP(emailTrimmed);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(res.message || `Verification code sent to ${emailTrimmed}`);
      setStep('verify');
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      if (res.devOtp) setDevOtp(res.devOtp);
      setDeliveryInfo({
        delivered: res.delivered ?? true,
        error: res.error || null,
      });
    } else {
      setError(res.message);
      if (res.notRegistered) setIsAccountNotFound(true);
    }
  };

  // 3. Verify OTP Login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    const res = await verifyLoginOTP(email.trim().toLowerCase(), otpCode);
    setIsSubmitting(false);
    if (!res.success) setError(res.message);
  };

  const handleAutoFill = () => {
    if (!devOtp) return;
    setOtpDigits(devOtp.split('').concat(Array(6).fill('')).slice(0, 6));
    setError('');
  };

  return (
    <div className="classic-form-content">
      {/* Sleek Sub-Method Switcher */}
      <div className="classic-sub-tabs">
        <button
          type="button"
          className={`classic-sub-tab ${authMethod === 'password' ? 'active' : ''}`}
          onClick={() => {
            setAuthMethod('password');
            setError('');
            setIsAccountNotFound(false);
          }}
        >
          <IconLock size={14} /> Password
        </button>
        <button
          type="button"
          className={`classic-sub-tab ${authMethod === 'otp' ? 'active' : ''}`}
          onClick={() => {
            setAuthMethod('otp');
            setStep('email');
            setError('');
            setIsAccountNotFound(false);
          }}
        >
          <IconKey size={14} /> Email Code
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="classic-alert classic-alert-error" role="alert">
          <IconAlertCircle size={16} className="classic-alert-icon" />
          <div className="classic-alert-body">
            <div>{error}</div>
            {isAccountNotFound && (
              <button
                type="button"
                className="classic-alert-action"
                onClick={() => onSwitchToRegister(email)}
              >
                Create account with this email →
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          METHOD 1: CLASSIC PASSWORD LOGIN (Default)
          ========================================================================= */}
      {authMethod === 'password' && (
        <form onSubmit={handlePasswordLogin} className="classic-form" noValidate>
          <div className="classic-field">
            <label htmlFor="login-email-input">Email address</label>
            <div className="classic-input-wrap">
              <span className="classic-input-icon"><IconMail size={16} /></span>
              <input
                id="login-email-input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                  setIsAccountNotFound(false);
                }}
                autoComplete="email"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="classic-field">
            <div className="classic-field-header">
              <label htmlFor="login-password-input">Password</label>
            </div>
            <div className="classic-input-wrap">
              <span className="classic-input-icon"><IconLock size={16} /></span>
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="classic-pwd-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="classic-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex-center gap-2">
                <span className="classic-spinner"></span> Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      )}

      {/* =========================================================================
          METHOD 2: EMAIL VERIFICATION CODE
          ========================================================================= */}
      {authMethod === 'otp' && step === 'email' && (
        <form onSubmit={handleSendOTP} className="classic-form" noValidate>
          <div className="classic-field">
            <label htmlFor="otp-login-email">Email address</label>
            <div className="classic-input-wrap">
              <span className="classic-input-icon"><IconMail size={16} /></span>
              <input
                id="otp-login-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                  setIsAccountNotFound(false);
                }}
                autoComplete="email"
                autoFocus
                required
              />
            </div>
            <p className="classic-field-hint">A 6-digit one-time code will be sent to your email.</p>
          </div>

          <button
            id="otp-send-code-btn"
            type="submit"
            className="classic-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex-center gap-2">
                <span className="classic-spinner"></span> Sending Code...
              </span>
            ) : (
              <span className="flex-center gap-2">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                Send Verification Code
              </span>
            )}
          </button>
        </form>
      )}

      {authMethod === 'otp' && step === 'verify' && (
        <form onSubmit={handleVerifyOTP} className="classic-form" noValidate>
          <div className="classic-verify-target-row">
            <span>Code sent to <strong>{email}</strong></span>
            <button
              type="button"
              className="classic-text-btn"
              onClick={() => {
                setStep('email');
                setError('');
                setOtpDigits(['', '', '', '', '', '']);
              }}
            >
              Change
            </button>
          </div>

          {/* 6 Digit Verification Boxes */}
          <div className="classic-otp-group">
            <div className="classic-otp-boxes" onPaste={handleDigitPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  id={`login-otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`classic-otp-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                />
              ))}
            </div>
          </div>

          {/* Development Test Code Helper */}
          {devOtp && (
            <div className="classic-dev-chip">
              <span className="classic-dev-label">Test Code:</span>
              <span className="classic-dev-code">{devOtp}</span>
              <button type="button" className="classic-dev-btn" onClick={handleAutoFill}>
                Auto-fill
              </button>
            </div>
          )}

          <div className="classic-resend-row">
            <span>Didn't receive code?</span>
            <button
              type="button"
              className="classic-text-btn"
              disabled={resendCooldown > 0 || isSubmitting}
              onClick={() => handleSendOTP()}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          <button
            id="otp-verify-btn"
            type="submit"
            className="classic-btn-primary"
            disabled={isSubmitting || otpCode.length < 6}
          >
            {isSubmitting ? (
              <span className="flex-center gap-2">
                <span className="classic-spinner"></span> Verifying...
              </span>
            ) : (
              'Verify & Sign In'
            )}
          </button>
        </form>
      )}

      {/* Editorial OR Divider */}
      <div className="editorial-or-divider">
        <span className="divider-line"></span>
        <span className="divider-text">OR</span>
        <span className="divider-line"></span>
      </div>

      {/* Switch to Register link */}
      <div className="editorial-alt-row">
        <button
          type="button"
          className="editorial-alt-link"
          onClick={() => onSwitchToRegister(email)}
        >
          <span className="lock-icon">🔒</span> Don't have an account? <span className="highlight-link">Create one now &rarr;</span>
        </button>
      </div>

      {/* 256-bit Encrypted Session Box */}
      <div className="editorial-encrypted-card">
        <div className="encrypted-icon-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="encrypted-text-box">
          <strong>256-bit Encrypted Session</strong>
          <span>BMChat Secure Engine</span>
        </div>
        <span className="encrypted-arrow">&rsaquo;</span>
      </div>
    </div>
  );
};
