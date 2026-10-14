import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconX, IconCheck, IconImage, IconUser } from './Icons';

// Categorized Preset Avatar Options
const AVATAR_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'humans', label: 'People' },
  { id: 'adventurers', label: 'Adventurers' },
  { id: 'robots', label: 'Robots' },
  { id: 'artistic', label: 'Artistic' },
  { id: 'fun', label: 'Doodles' },
];

const PRESET_AVATARS = [
  // Characters / Humans (Avataaars)
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4', category: 'humans' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=ffdfbf', category: 'humans' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aiden&backgroundColor=c0aede', category: 'humans' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya&backgroundColor=d1d4f9', category: 'humans' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=ffd5dc', category: 'humans' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&backgroundColor=c0aede', category: 'humans' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=b6e3f4', category: 'humans' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace&backgroundColor=ffd5dc', category: 'humans' },

  // Adventurers / Anime Heroes
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Willow&backgroundColor=b6e3f4', category: 'adventurers' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper&backgroundColor=ffdfbf', category: 'adventurers' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nova&backgroundColor=d1d4f9', category: 'adventurers' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kai&backgroundColor=ffd5dc', category: 'adventurers' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&backgroundColor=c0aede', category: 'adventurers' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rowan&backgroundColor=b6e3f4', category: 'adventurers' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ember&backgroundColor=ffdfbf', category: 'adventurers' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zephyr&backgroundColor=d1d4f9', category: 'adventurers' },

  // Robots / Cyber (Bottts)
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=6366f1', category: 'robots' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=ec4899', category: 'robots' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Milo&backgroundColor=10b981', category: 'robots' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Oliver&backgroundColor=f59e0b', category: 'robots' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha&backgroundColor=8b5cf6', category: 'robots' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Leo&backgroundColor=06b6d4', category: 'robots' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber&backgroundColor=3b82f6', category: 'robots' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Volt&backgroundColor=eab308', category: 'robots' },

  // Artistic / Modern Aesthetics (Lorelei & Micah)
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Seraphina&backgroundColor=ffd5dc', category: 'artistic' },
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Dante&backgroundColor=b6e3f4', category: 'artistic' },
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Elena&backgroundColor=ffdfbf', category: 'artistic' },
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=Julian&backgroundColor=d1d4f9', category: 'artistic' },
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=Amara&backgroundColor=ffd5dc', category: 'artistic' },
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=Orion&backgroundColor=c0aede', category: 'artistic' },
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Vivian&backgroundColor=d1d4f9', category: 'artistic' },
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=Kiran&backgroundColor=b6e3f4', category: 'artistic' },

  // Doodles / Fun (Personas & Croodles)
  { url: 'https://api.dicebear.com/7.x/personas/svg?seed=Max&backgroundColor=b6e3f4', category: 'fun' },
  { url: 'https://api.dicebear.com/7.x/personas/svg?seed=Bella&backgroundColor=ffd5dc', category: 'fun' },
  { url: 'https://api.dicebear.com/7.x/croodles/svg?seed=Toby&backgroundColor=ffdfbf', category: 'fun' },
  { url: 'https://api.dicebear.com/7.x/croodles/svg?seed=Luna&backgroundColor=d1d4f9', category: 'fun' },
  { url: 'https://api.dicebear.com/7.x/personas/svg?seed=Rocky&backgroundColor=c0aede', category: 'fun' },
  { url: 'https://api.dicebear.com/7.x/croodles/svg?seed=Coco&backgroundColor=ffd5dc', category: 'fun' },
];

export const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  });

  const [activeCategory, setActiveCategory] = useState('all');
  const [randomAvatars, setRandomAvatars] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  // Generate 6 fresh random avatars on demand
  const handleRollRandom = () => {
    const styles = ['avataaars', 'adventurer', 'bottts', 'lorelei', 'micah', 'personas'];
    const colors = ['b6e3f4', 'ffdfbf', 'd1d4f9', 'ffd5dc', 'c0aede', '6366f1', '10b981', 'f59e0b', 'ec4899'];
    const fresh = [];
    for (let i = 0; i < 6; i++) {
      const style = styles[i % styles.length];
      const seed = Math.random().toString(36).substring(2, 8);
      const bg = colors[Math.floor(Math.random() * colors.length)];
      fresh.push({
        url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${bg}`,
        category: 'random',
      });
    }
    setRandomAvatars(fresh);
    setActiveCategory('random');
  };

  // Combine static presets with freshly rolled avatars
  const allAvatars = [...randomAvatars, ...PRESET_AVATARS];
  const displayedAvatars =
    activeCategory === 'all'
      ? allAvatars
      : allAvatars.filter((av) => av.category === activeCategory);

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
                JPG, PNG, GIF or SVG up to 5MB
              </div>
            </div>
          </div>

          {/* Preset Avatars Library */}
          <div className="presets-wrap">
            <div className="presets-header-row">
              <span className="text-xs text-secondary font-medium">Choose an avatar or roll random:</span>
              <button
                type="button"
                className="roll-random-btn"
                onClick={handleRollRandom}
                title="Generate fresh random avatars"
              >
                <span>🎲 Roll Random</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="avatar-category-pills">
              {AVATAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`avatar-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
              {randomAvatars.length > 0 && (
                <button
                  type="button"
                  className={`avatar-cat-pill ${activeCategory === 'random' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('random')}
                >
                  ✨ Generated
                </button>
              )}
            </div>

            <div className="presets-grid scrollable-presets">
              {displayedAvatars.map((preset, idx) => (
                <button
                  key={`${preset.url}-${idx}`}
                  type="button"
                  className={`preset-btn ${formData.avatar === preset.url ? 'preset-active' : ''}`}
                  onClick={() => handleSelectPreset(preset.url)}
                  title={`Avatar ${idx + 1}`}
                >
                  <img src={preset.url} alt={`Avatar ${idx + 1}`} className="preset-img" loading="lazy" />
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
