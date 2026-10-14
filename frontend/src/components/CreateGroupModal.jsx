import React, { useState } from 'react';
import { groupAPI } from '../services/api';
import { IconUsers, IconX, IconSearch, IconCheck } from './Icons';

const PRESET_GROUP_ICONS = [
  'Team', 'Tech', 'Code', 'Design', 'Project', 'General', 'Music', 'Games'
];

export const CreateGroupModal = ({ isOpen, onClose, users, token, onGroupCreated, showToast }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Team');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchMember, setSearchMember] = useState('');

  if (!isOpen) return null;

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === users.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(users.map((u) => u._id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast?.('Please enter a group name');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await groupAPI.createGroup(token, {
        name: name.trim(),
        description: description.trim(),
        avatar: selectedIcon,
        members: selectedMembers,
      });

      if (res.success && res.group) {
        showToast?.(`Group "${res.group.name}" created!`);
        onGroupCreated(res.group);
        onClose();
        setName('');
        setDescription('');
        setSelectedMembers([]);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      showToast?.(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchMember.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="create-group-modal glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="create-group-icon-badge">
              <IconUsers size={22} />
            </div>
            <div>
              <h3 className="modal-title">Create New Group</h3>
              <p className="modal-subtitle">Start a collaborative room with multiple contacts</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Close modal">
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-group-form">
          {/* Group Category Tag Selector */}
          <div className="form-group">
            <label className="form-label">Group Category</label>
            <div className="group-icons-grid">
              {PRESET_GROUP_ICONS.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`group-icon-btn ${selectedIcon === cat ? 'active' : ''}`}
                  onClick={() => setSelectedIcon(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Group Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="group-name-input">
              Group Name <span className="text-danger">*</span>
            </label>
            <input
              id="group-name-input"
              type="text"
              className="form-input"
              placeholder="e.g. Project Developers, Book Club, Coffee Chill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
            />
          </div>

          {/* Group Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="group-desc-input">
              Description (Optional)
            </label>
            <input
              id="group-desc-input"
              type="text"
              className="form-input"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Member Selection */}
          <div className="form-group">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label m-0">
                Select Members ({selectedMembers.length} selected)
              </label>
              {users.length > 0 && (
                <button
                  type="button"
                  className="btn-select-all"
                  onClick={handleSelectAll}
                >
                  {selectedMembers.length === users.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {users.length > 4 && (
              <input
                type="text"
                className="form-input search-members-input mb-2"
                placeholder="Search contacts..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
              />
            )}

            <div className="members-select-list">
              {filteredUsers.length === 0 ? (
                <div className="empty-members-hint">No contacts found</div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = selectedMembers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      className={`member-select-row ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleMember(u._id)}
                    >
                      <div className="member-info-left">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="member-checkbox"
                        />
                        <div className="contact-avatar-mini">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} />
                          ) : (
                            <div className="avatar-fallback">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="member-name">{u.name}</div>
                          <div className="member-email">{u.email}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              <IconUsers size={16} />
              <span>{isSubmitting ? 'Creating...' : 'Create Group'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
