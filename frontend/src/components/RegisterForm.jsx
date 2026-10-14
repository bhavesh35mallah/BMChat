import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconUser,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconArrowLeft,
  IconRefresh,
} from './Icons';

export const RegisterForm = ({ onSwitchToLogin, initialEmail = '' }) => {
  const { sendRegisterOTP, verifyRegisterOTP } = useAuth();

  // step: 'info' | 'verify'
  const [step, setStep] = useState('info');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
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

  // 1. Send Verification Code (Validates username, email, password)
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();

    if (!username.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setIsAlreadyRegistered(false);
    setSuccessMsg('');

    const normalizedEmail = email.trim().toLowerCase();
    const payload = {
      name: username.trim(),
      email: normalizedEmail,
    };

    const res = await sendRegisterOTP(payload);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(res.message || `Verification code sent to ${normalizedEmail}`);
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
      if (res.alreadyRegistered) setIsAlreadyRegistered(true);
    }
  };

  // 2. Verify OTP and complete registration
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otpCode.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const payload = {
      name: username.trim(),
      email: normalizedEmail,
      password,
      otp: otpCode,
    };

    const res = await verifyRegisterOTP(payload);
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
      {/* Error Alert */}
      {error && (
        <div className="classic-alert classic-alert-error" role="alert">
          <IconAlertCircle size={16} className="classic-alert-icon" />
          <div className="classic-alert-body">
            <div>{error}</div>
            {isAlreadyRegistered && (
              <button
                type="button"
                className="classic-alert-action"
                onClick={() => onSwitchToLogin(email)}
              >
                Sign in with this email →
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 1: DETAILS (NAME, EMAIL, PASSWORD)
          ========================================================================= */}
      {step === 'info' && (
        <form onSubmit={handleSendOTP} className="classic-form" noValidate>
          <div className="classic-field">
            <label htmlFor="reg-name-input">Full name</label>
            <div className="classic-input-wrap">
              <span className="classic-input-icon"><IconUser size={16} /></span>
              <input
                id="reg-name-input"
                type="text"
                placeholder="Alex Morgan"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="name"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="classic-field">
            <label htmlFor="reg-email-input">Email address</label>
            <div className="classic-input-wrap">
              <span className="classic-input-icon"><IconMail size={16} /></span>
              <input
                id="reg-email-input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                  setIsAlreadyRegistered(false);
                }}
                autoComplete="email"
                required
              />
            </div>
            <p className="classic-field-hint">A verification code will be sent to confirm your email.</p>
          </div>

          <div className="classic-field">
            <label htmlFor="reg-pwd-input">Create password</label>
            <div className="classic-input-wrap">
              <span className="classic-input-icon"><IconLock size={16} /></span>
              <input
                id="reg-pwd-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="new-password"
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
            id="register-submit-btn"
            type="submit"
            className="classic-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex-center gap-2">
                <span className="classic-spinner"></span> Sending Code...
              </span>
            ) : (
              'Continue & Verify Email →'
            )}
          </button>
        </form>
      )}

      {/* =========================================================================
          STEP 2: OTP VERIFICATION
          ========================================================================= */}
      {step === 'verify' && (
        <form onSubmit={handleVerifyOTP} className="classic-form" noValidate>
          <div className="classic-verify-target-row">
            <span>Code sent to <strong>{email}</strong></span>
            <button
              type="button"
              className="classic-text-btn"
              onClick={() => {
                setStep('info');
                setError('');
                setOtpDigits(['', '', '', '', '', '']);
              }}
            >
              Back
            </button>
          </div>

          <div className="classic-otp-group">
            <div className="classic-otp-boxes" onPaste={handleDigitPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  id={`reg-otp-${i}`}
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
            id="reg-verify-btn"
            type="submit"
            className="classic-btn-primary"
            disabled={isSubmitting || otpCode.length < 6}
          >
            {isSubmitting ? (
              <span className="flex-center gap-2">
                <span className="classic-spinner"></span> Creating Account...
              </span>
            ) : (
              'Verify & Create Account'
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

      {/* Switch to Login link */}
      <div className="editorial-alt-row">
        <button
          type="button"
          className="editorial-alt-link"
          onClick={() => onSwitchToLogin(email)}
        >
          <span className="lock-icon">🔒</span> Already have an account? <span className="highlight-link">Sign in here &rarr;</span>
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
