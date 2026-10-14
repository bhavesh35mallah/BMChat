import React, { useState, useEffect } from 'react';
import { IconPencil, IconX, IconCheck } from './Icons';

export const NicknameModal = ({
  isOpen,
  onClose,
  targetUser,
  currentNickname,
  onSaveNickname,
}) => {
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    setNickname(currentNickname || '');
  }, [currentNickname, isOpen]);

  if (!isOpen || !targetUser) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveNickname?.(targetUser._id, nickname.trim());
    onClose();
  };

  const handleClear = () => {
    onSaveNickname?.(targetUser._id, '');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="nickname-modal-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Edit Contact Nickname</h3>
            <p className="modal-desc">
              Set a private nickname for <strong>{targetUser.name}</strong>. Only you will see this.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3">
          <div className="form-group">
            <label htmlFor="contact-nickname-input">Nickname</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <IconPencil size={15} />
              </span>
              <input
                id="contact-nickname-input"
                type="text"
                placeholder={`e.g. Bestie, ${targetUser.name?.split(' ')[0]}...`}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-actions mt-4 flex-between">
            {currentNickname ? (
              <button
                type="button"
                className="btn-danger-ghost btn-sm"
                onClick={handleClear}
              >
                Reset to Default
              </button>
            ) : <span />}

            <div className="flex-gap">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Nickname
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
