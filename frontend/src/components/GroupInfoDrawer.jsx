import React, { useState } from 'react';
import { groupAPI } from '../services/api';
import {
  IconUsers,
  IconUser,
  IconPlus,
  IconX,
  IconLogOut,
  IconTrash,
  IconShield,
  IconSearch,
  IconCheck,
} from './Icons';

export const GroupInfoDrawer = ({
  isOpen,
  onClose,
  group,
  currentUser,
  allUsers,
  token,
  isUserOnline,
  onGroupUpdated,
  onGroupLeft,
  showToast,
}) => {
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [searchAddMember, setSearchAddMember] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !group) return null;

  const currentUserIdStr = currentUser?._id?.toString();
  const primaryAdminId = (group.admin?._id || group.admin)?.toString();
  const isPrimaryAdmin = primaryAdminId === currentUserIdStr;
  const isCurrentUserAdmin =
    isPrimaryAdmin ||
    (group.admins || []).some((adm) => (adm?._id || adm)?.toString() === currentUserIdStr);

  // Filter available contacts not already in group
  const existingMemberIds = new Set((group.members || []).map((m) => (m._id || m).toString()));
  const availableToAdd = allUsers.filter(
    (u) =>
      !existingMemberIds.has(u._id.toString()) &&
      (u.name?.toLowerCase().includes(searchAddMember.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchAddMember.toLowerCase()))
  );

  const handleToggleNewMember = (userId) => {
    setSelectedNewMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembersSubmit = async () => {
    if (selectedNewMembers.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await groupAPI.addMembers(token, group._id, selectedNewMembers);
      if (res.success && res.group) {
        showToast?.('Members added to group');
        onGroupUpdated(res.group);
        setIsAddingMembers(false);
        setSelectedNewMembers([]);
        setSearchAddMember('');
      }
    } catch (err) {
      console.error('Failed to add members:', err);
      showToast?.(err.message || 'Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;
    try {
      const res = await groupAPI.removeMember(token, group._id, memberId);
      if (res.success && res.group) {
        showToast?.(`${memberName} removed from group`);
        onGroupUpdated(res.group);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      showToast?.(err.message || 'Failed to remove member');
    }
  };

  const handleMakeAdmin = async (memberId, memberName) => {
    try {
      const res = await groupAPI.makeAdmin(token, group._id, memberId);
      if (res.success && res.group) {
        showToast?.(`${memberName} is now a group admin`);
        onGroupUpdated(res.group);
      }
    } catch (err) {
      console.error('Failed to make admin:', err);
      showToast?.(err.message || 'Failed to promote to admin');
    }
  };

  const handleDismissAdmin = async (memberId, memberName) => {
    try {
      const res = await groupAPI.dismissAdmin(token, group._id, memberId);
      if (res.success && res.group) {
        showToast?.(`${memberName} is no longer an admin`);
        onGroupUpdated(res.group);
      }
    } catch (err) {
      console.error('Failed to dismiss admin:', err);
      showToast?.(err.message || 'Failed to dismiss admin');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      const res = await groupAPI.leaveGroup(token, group._id);
      if (res.success) {
        showToast?.('You left the group');
        onGroupLeft(group._id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to leave group:', err);
      showToast?.(err.message || 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this group? All history will be lost.')) return;
    try {
      const res = await groupAPI.deleteGroup(token, group._id);
      if (res.success) {
        showToast?.('Group deleted');
        onGroupLeft(group._id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete group:', err);
      showToast?.(err.message || 'Failed to delete group');
    }
  };

  const totalAdminsCount =
    1 + ((group.admins || []).filter((a) => (a._id || a)?.toString() !== primaryAdminId).length || 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="group-info-drawer glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="group-drawer-header">
          <div className="group-drawer-avatar">
            <IconUsers size={32} />
          </div>
          <h2 className="group-drawer-name">{group.name}</h2>
          <p className="group-drawer-desc">
            {group.description || 'No description provided.'}
          </p>
          <div className="group-drawer-meta-badge">
            <span className="meta-chip">
              <IconUsers size={13} />
              <span>{group.members?.length || 0} Members</span>
            </span>
            <span className="meta-chip">
              <IconShield size={13} />
              <span>{totalAdminsCount} {totalAdminsCount === 1 ? 'Admin' : 'Admins'}</span>
            </span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Members Section */}
        <div className="group-drawer-body">
          <div className="flex-between mb-2">
            <span className="group-section-title">Members ({group.members?.length || 0})</span>
            {isCurrentUserAdmin && !isAddingMembers && (
              <button
                type="button"
                className="btn-add-member-toggle"
                onClick={() => setIsAddingMembers(true)}
              >
                <IconPlus size={13} />
                <span>Add Members</span>
              </button>
            )}
          </div>

          {/* Add Members Inline Panel */}
          {isAddingMembers && (
            <div className="add-members-panel">
              <div className="flex-between mb-2">
                <span className="text-xs text-muted font-medium">Select contacts to invite:</span>
                <button
                  type="button"
                  className="btn-cancel-mini"
                  onClick={() => {
                    setIsAddingMembers(false);
                    setSelectedNewMembers([]);
                    setSearchAddMember('');
                  }}
                >
                  Cancel
                </button>
              </div>

              <div className="search-contacts-mini-wrap mb-2">
                <IconSearch size={14} className="search-icon-inside" />
                <input
                  type="text"
                  className="search-contacts-mini-input"
                  placeholder="Search contacts..."
                  value={searchAddMember}
                  onChange={(e) => setSearchAddMember(e.target.value)}
                />
              </div>

              <div className="add-members-list">
                {availableToAdd.length === 0 ? (
                  <div className="empty-contacts-hint">No more contacts available to add</div>
                ) : (
                  availableToAdd.map((u) => {
                    const isChecked = selectedNewMembers.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        className={`member-select-row ${isChecked ? 'selected' : ''}`}
                        onClick={() => handleToggleNewMember(u._id)}
                      >
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
                            u.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="member-name">{u.name}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm w-full mt-2"
                onClick={handleAddMembersSubmit}
                disabled={isSubmitting || selectedNewMembers.length === 0}
              >
                {isSubmitting ? 'Adding...' : `Add Selected (${selectedNewMembers.length})`}
              </button>
            </div>
          )}

          {/* Members List */}
          <div className="group-members-list">
            {(group.members || []).map((m) => {
              const memberId = (m._id || m).toString();
              const isOwner = primaryAdminId === memberId;
              const isMemberAdmin =
                isOwner ||
                (group.admins || []).some((adm) => (adm?._id || adm)?.toString() === memberId);
              const online = isUserOnline(memberId);
              const isMe = memberId === currentUserIdStr;

              return (
                <div key={memberId} className="group-member-item">
                  <div className="member-item-left">
                    <div className="avatar-wrapper member-avatar-wrap">
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.name} className="contact-avatar-img" />
                      ) : (
                        <div className="contact-avatar-placeholder">
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`online-indicator ${online ? 'online' : 'offline'}`} />
                    </div>

                    <div>
                      <div className="member-item-name">
                        <span>{m.name || 'Member'}</span>
                        {isMe && <span className="member-tag-you">(You)</span>}
                        {isOwner && <span className="admin-pill-tag owner-tag">Creator</span>}
                        {isMemberAdmin && !isOwner && <span className="admin-pill-tag">Admin</span>}
                      </div>
                      <span className="member-item-status">
                        {online ? 'Active now' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Group Admins */}
                  {isCurrentUserAdmin && !isMe && !isOwner && (
                    <div className="member-actions-group">
                      {isMemberAdmin ? (
                        <button
                          type="button"
                          className="btn-admin-action btn-demote"
                          onClick={() => handleDismissAdmin(memberId, m.name)}
                          title="Dismiss as Admin"
                        >
                          Dismiss Admin
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-admin-action btn-promote"
                          onClick={() => handleMakeAdmin(memberId, m.name)}
                          title="Promote to Group Admin"
                        >
                          <IconShield size={12} />
                          <span>Make Admin</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-remove-member-action"
                        onClick={() => handleRemoveMember(memberId, m.name)}
                        title={`Remove ${m.name} from group`}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="group-drawer-footer">
          <button
            type="button"
            className="btn-leave-group"
            onClick={handleLeaveGroup}
          >
            <IconLogOut size={16} />
            <span>Leave Group</span>
          </button>

          {isCurrentUserAdmin && (
            <button
              type="button"
              className="btn-delete-group"
              onClick={handleDeleteGroup}
            >
              <IconTrash size={16} />
              <span>Delete Group</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
