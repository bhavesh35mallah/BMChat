import React, { useState } from 'react';
import { IconPoll, IconPlus, IconX } from './Icons';

export const CreatePollModal = ({ isOpen, onClose, onSubmitPoll, showToast }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  if (!isOpen) return null;

  const handleOptionChange = (index, value) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      showToast?.('Maximum 6 options allowed');
      return;
    }
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      showToast?.('A poll must have at least 2 options');
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) {
      showToast?.('Please enter a poll question');
      return;
    }

    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      showToast?.('Please provide at least 2 valid options');
      return;
    }

    onSubmitPoll({
      question: question.trim(),
      options: validOptions, // array of strings: ['Option 1', 'Option 2']
    });

    onClose();
    setQuestion('');
    setOptions(['', '']);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="create-poll-modal glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-icon-col">
            <div className="poll-icon-badge">
              <IconPoll size={20} />
            </div>
            <div>
              <h3 className="modal-title">Create Poll</h3>
              <p className="modal-subtitle">Ask a question and collect real-time votes</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            aria-label="Close modal"
          >
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-poll-form">
          {/* Question */}
          <div className="form-group">
            <label className="form-label" htmlFor="poll-question-input">
              Question <span className="text-danger">*</span>
            </label>
            <input
              id="poll-question-input"
              type="text"
              className="form-input"
              placeholder="e.g. Which design direction should we take?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={140}
              required
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="form-group">
            <label className="form-label">Options</label>
            <div className="poll-options-inputs">
              {options.map((opt, idx) => (
                <div key={idx} className="poll-option-row">
                  <span className="option-num-badge">{idx + 1}</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    maxLength={70}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="btn-remove-option"
                      onClick={() => handleRemoveOption(idx)}
                      title="Remove option"
                      aria-label="Remove option"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <button
                type="button"
                className="btn-add-option"
                onClick={handleAddOption}
              >
                <IconPlus size={14} />
                <span>Add Option</span>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!question.trim()}
            >
              <IconPoll size={16} />
              <span>Create Poll</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
