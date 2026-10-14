import React, { useState } from 'react';
import { IconX, IconImage, IconSend, IconCheck } from './Icons';

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#0f172a', // Midnight Slate
  '#e11d48', // Rose
];

export const StatusCreatorModal = ({ isOpen, onClose, onStatusCreated, showToast }) => {
  const [mode, setMode] = useState('text'); // 'text' | 'media'
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [media, setMedia] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  if (!isOpen) return null;

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast?.('Please upload a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setMedia(ev.target.result);
      setMode('media');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !media) {
      showToast?.('Please enter some text or select an image');
      return;
    }

    setIsPosting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text.trim(),
          media,
          bgColor: selectedColor,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.('Status posted! Expires in 24 hours');
        onStatusCreated?.(data.status);
        setText('');
        setMedia('');
        onClose();
      } else {
        showToast?.(data.message || 'Failed to post status');
      }
    } catch (err) {
      showToast?.('Failed to post status');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="status-creator-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">New Status</h3>
            <p className="modal-desc">Share an update with your contacts. Disappears after 24 hours.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="status-mode-tabs">
          <button
            type="button"
            className={`status-mode-btn ${mode === 'text' ? 'active' : ''}`}
            onClick={() => setMode('text')}
          >
            Text Update
          </button>
          <button
            type="button"
            className={`status-mode-btn ${mode === 'media' ? 'active' : ''}`}
            onClick={() => setMode('media')}
          >
            Photo Status
          </button>
        </div>

        {/* Preview Viewport */}
        <div
          className="status-preview-box"
          style={{ backgroundColor: mode === 'text' ? selectedColor : '#0f172a' }}
        >
          {mode === 'media' && media ? (
            <div className="status-preview-media">
              <img src={media} alt="Selected" />
              <button
                type="button"
                className="status-remove-photo-btn"
                onClick={() => setMedia('')}
              >
                Change Photo
              </button>
            </div>
          ) : mode === 'media' ? (
            <label className="status-upload-dropzone">
              <IconImage size={36} />
              <span>Click to select an image from your device</span>
              <span className="text-xs text-secondary">PNG, JPG, GIF up to 5MB</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleMediaUpload}
                style={{ display: 'none' }}
              />
            </label>
          ) : (
            <textarea
              className="status-textarea-input"
              placeholder="What's on your mind? Type a status..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={250}
              autoFocus
            />
          )}
        </div>

        {/* Color Palette (for text mode) */}
        {mode === 'text' && (
          <div className="status-colors-palette">
            <span className="text-xs text-secondary font-medium mr-2">Theme:</span>
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`status-color-circle ${selectedColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              >
                {selectedColor === color && <IconCheck size={12} />}
              </button>
            ))}
          </div>
        )}

        {/* Optional Caption for Media Mode */}
        {mode === 'media' && media && (
          <div className="form-group mt-3">
            <input
              type="text"
              placeholder="Add a caption..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="user-search-input"
              maxLength={150}
            />
          </div>
        )}

        <div className="modal-actions mt-4">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={isPosting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isPosting || (!text.trim() && !media)}
          >
            {isPosting ? 'Posting...' : 'Share Status'}
          </button>
        </div>
      </div>
    </div>
  );
};
