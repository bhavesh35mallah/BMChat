import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconX, IconCheck, IconImage, IconUser } from './Icons';

// Preset avatar options
const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=6366f1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=ec4899',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Milo&backgroundColor=10b981',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Oliver&backgroundColor=f59e0b',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha&backgroundColor=8b5cf6',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Leo&backgroundColor=06b6d4',
];

export const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  // Handle custom image file selection and compression to base64
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image size must be less than 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData((prev) => ({
        ...prev,
        avatar: uploadEvent.target.result,
      }));
      setStatusMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (url) => {
    setFormData((prev) => ({
      ...prev,
      avatar: url,
    }));
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({
      ...prev,
      avatar: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setStatusMessage({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage({ type: '', text: '' });

    const res = await updateProfile({
      name: formData.name.trim(),
      bio: formData.bio.trim(),
      avatar: formData.avatar,
    });

    setIsSaving(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: res.message || 'Failed to update profile' });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Edit Profile</h3>
            <p className="modal-desc">Update your avatar, display name, and bio in MongoDB</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <IconX size={18} />
          </button>
        </div>

        {statusMessage.text && (
          <div className={`alert alert-${statusMessage.type} mb-4`}>
            <span><IconCheck size={16} /></span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Avatar Section */}
          <div className="avatar-edit-section">
            <div className="avatar-preview-wrap">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Profile Preview" className="avatar-preview-img" />
              ) : (
                <div className="avatar-preview-placeholder">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div className="avatar-controls">
              <label className="btn-secondary btn-sm upload-btn-label">
                <IconImage size={15} />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {formData.avatar && (
                <button
                  type="button"
                  className="btn-danger-ghost btn-sm"
                  onClick={handleRemoveAvatar}
                >
                  Remove
                </button>
              )}

              <div className="text-secondary text-xs mt-1">
                JPG, PNG or GIF up to 5MB
              </div>
            </div>
          </div>

          {/* Preset Avatars */}
          <div className="presets-wrap">
            <span className="text-xs text-secondary mb-2 block font-medium">Or choose a preset avatar:</span>
            <div className="presets-grid">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`preset-btn ${formData.avatar === preset ? 'preset-active' : ''}`}
                  onClick={() => handleSelectPreset(preset)}
                >
                  <img src={preset} alt={`Preset ${idx + 1}`} className="preset-img" />
                </button>
              ))}
            </div>
          </div>

          {/* Name Field */}
          <div className="form-group">
            <label htmlFor="edit-profile-name">Full Name</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <IconUser size={15} />
              </span>
              <input
                id="edit-profile-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Bio Field */}
          <div className="form-group">
            <label htmlFor="edit-profile-bio">Bio</label>
            <div className="input-wrapper">
              <textarea
                id="edit-profile-bio"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell others a little about yourself..."
                maxLength={200}
              />
            </div>
            <div className="text-xs text-secondary text-right">
              {formData.bio.length}/200
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
