import React, { useState } from 'react';
import { IconX } from './Icons';

const EMOJI_CATEGORIES = {
  Reactions: ['❤️', '🔥', '🎉', '✨', '👏', '🙌', '💯', '🚀', '⭐', '⚡'],
  Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😏', '🤔'],
  Hands: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤙', '👋', '🤝', '🙏', '💪'],
  Fun: ['🎈', '🎂', '☕', '🍕', '🍔', '🍦', '🎮', '💡', '📚', '🎯', '🏆'],
};

export const EmojiPicker = ({ onSelectEmoji, onClose }) => {
  const [activeTab, setActiveTab] = useState('Reactions');

  return (
    <div className="emoji-picker-popover" onClick={(e) => e.stopPropagation()}>
      <div className="emoji-picker-header">
        <div className="emoji-tabs">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`emoji-tab-btn ${activeTab === cat ? 'active' : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <button type="button" className="emoji-close-btn" onClick={onClose} aria-label="Close emoji picker">
          <IconX size={15} />
        </button>
      </div>

      <div className="emoji-grid">
        {EMOJI_CATEGORIES[activeTab].map((emoji, index) => (
          <button
            key={index}
            type="button"
            className="emoji-item-btn"
            onClick={() => onSelectEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
