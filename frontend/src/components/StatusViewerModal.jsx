import React, { useState, useEffect } from 'react';
import { IconX, IconArrowLeft, IconArrowRight, IconSend, IconClock } from './Icons';

export const StatusViewerModal = ({
  isOpen,
  onClose,
  statusGroup, // { user, statuses: [...] }
  onReply,
  currentUser,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');

  const statuses = statusGroup?.statuses || [];
  const activeStatus = statuses[currentIndex] || null;

  useEffect(() => {
    setCurrentIndex(0);
    setReplyText('');
  }, [statusGroup]);

  // Auto advance every 6 seconds
  useEffect(() => {
    if (!isOpen || statuses.length === 0) return;

    const timer = setTimeout(() => {
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [isOpen, currentIndex, statuses.length]);

  if (!isOpen || !statusGroup || !activeStatus) return null;

  const handlePrev = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply?.(statusGroup.user, `Replying to status: "${activeStatus.text || 'Media status'}"\n\n${replyText.trim()}`);
    setReplyText('');
    onClose();
  };

  const formatTimeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return '1d ago';
  };

  return (
    <div className="status-viewer-backdrop" onClick={onClose}>
      <div className="status-viewer-container" onClick={(e) => e.stopPropagation()}>
        {/* Progress Bars */}
        <div className="status-progress-bars">
          {statuses.map((s, idx) => (
            <div key={s._id || idx} className="status-progress-track">
              <div
                className={`status-progress-fill ${
                  idx < currentIndex ? 'completed' : idx === currentIndex ? 'active' : ''
                }`}
              />
            </div>
          ))}
        </div>

        {/* Header: User Info & Close */}
        <div className="status-viewer-header">
          <div className="status-viewer-user">
            {statusGroup.user?.avatar ? (
              <img src={statusGroup.user.avatar} alt={statusGroup.user.name} className="status-user-avatar" />
            ) : (
              <div className="status-user-avatar placeholder">
                {statusGroup.user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="status-user-name">
                {statusGroup.user?.name}
                {statusGroup.user?._id === currentUser?._id && <span className="you-pill"> (You)</span>}
              </div>
              <div className="status-time-row">
                <IconClock size={12} />
                <span>{formatTimeAgo(activeStatus.createdAt)}</span>
              </div>
            </div>
          </div>

          <button type="button" className="status-close-btn" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        {/* Slide Content */}
        <div
          className="status-slide-viewport"
          style={{
            backgroundColor: activeStatus.bgColor || '#6366f1',
          }}
        >
          {activeStatus.media ? (
            <div className="status-media-wrap">
              <img src={activeStatus.media} alt="Status Media" className="status-media-img" />
              {activeStatus.text && (
                <div className="status-media-caption">
                  <p>{activeStatus.text}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="status-text-content">
              <p>{activeStatus.text}</p>
            </div>
          )}

          {/* Touch / Click Navigation Hotspots */}
          <button type="button" className="status-nav-area left" onClick={handlePrev} aria-label="Previous story" />
          <button type="button" className="status-nav-area right" onClick={handleNext} aria-label="Next story" />
        </div>

        {/* Footer: Reply directly to user (if not own status) */}
        {statusGroup.user?._id !== currentUser?._id && (
          <form onSubmit={handleSendReply} className="status-reply-form">
            <input
              type="text"
              placeholder={`Reply to ${statusGroup.user?.name}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="status-reply-input"
            />
            <button type="submit" className="status-reply-btn" disabled={!replyText.trim()}>
              <IconSend size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
