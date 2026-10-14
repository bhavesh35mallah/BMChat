import React, { useState, useEffect } from 'react';
import { IconLock, IconUnlock, IconX, IconAlertCircle } from './Icons';

export const ChatLockModal = ({
  isOpen,
  onClose,
  targetName,
  isSettingPin, // true if creating/changing master PIN
  onSuccess,
  savedPin,
  mode = 'unlock', // 'unlock' | 'set_pin' | 'confirm_lock'
}) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setPin(['', '', '', '']);
    setErrorMsg('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const digit = val.slice(-1);
    const newPin = [...pin];
    newPin[idx] = digit;
    setPin(newPin);
    setErrorMsg('');

    // Auto focus next box
    if (digit && idx < 3) {
      const nextInput = document.getElementById(`lock-pin-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      const prevInput = document.getElementById(`lock-pin-${idx - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const entered = pin.join('');
    if (entered.length < 4) {
      setErrorMsg('Please enter all 4 digits');
      return;
    }

    if (mode === 'set_pin') {
      onSuccess?.(entered);
      onClose();
    } else {
      // Unlocking mode: verify PIN
      if (entered === savedPin) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg('Incorrect Passcode. Try again.');
        setPin(['', '', '', '']);
        document.getElementById('lock-pin-0')?.focus();
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="chat-lock-card glass-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <IconX size={18} />
        </button>

        <div className="chat-lock-header">
          <div className="chat-lock-icon-glow">
            {mode === 'set_pin' ? <IconLock size={28} /> : <IconLock size={28} />}
          </div>
          <h3 className="chat-lock-title">
            {mode === 'set_pin' ? 'Set Chat Passcode' : 'Locked Chat'}
          </h3>
          <p className="chat-lock-desc">
            {mode === 'set_pin'
              ? 'Create a 4-digit PIN to secure your private chats.'
              : `Enter your 4-digit passcode to open conversation with ${targetName || 'this contact'}.`}
          </p>
        </div>

        {errorMsg && (
          <div className="lock-error-pill">
            <IconAlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="lock-pin-inputs">
            {pin.map((digit, idx) => (
              <input
                key={idx}
                id={`lock-pin-${idx}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e.target.value, idx)}
                className="lock-pin-box"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <div className="modal-actions mt-4" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={pin.join('').length < 4}>
              {mode === 'set_pin' ? 'Save PIN' : 'Unlock Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
