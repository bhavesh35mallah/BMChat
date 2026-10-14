import React, { useState } from 'react';
import { IconCode, IconX } from './Icons';

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript / JSX' },
  { id: 'typescript', name: 'TypeScript / TSX' },
  { id: 'python', name: 'Python' },
  { id: 'html', name: 'HTML / XML' },
  { id: 'css', name: 'CSS / SCSS' },
  { id: 'json', name: 'JSON' },
  { id: 'sql', name: 'SQL' },
  { id: 'bash', name: 'Bash / Shell' },
  { id: 'cpp', name: 'C / C++' },
  { id: 'java', name: 'Java' },
];

export const CodeSnippetModal = ({ isOpen, onClose, onSubmitSnippet, showToast }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      showToast?.('Please write some code');
      return;
    }

    onSubmitSnippet({
      code: code.trim(),
      language,
    });
    onClose();
    setCode('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="code-snippet-modal glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-icon-col">
            <div className="snippet-icon-badge">
              <IconCode size={20} />
            </div>
            <div>
              <h3 className="modal-title">Share Code Snippet</h3>
              <p className="modal-subtitle">Format with monospace font, syntax tag, and copy button</p>
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

        <form onSubmit={handleSubmit} className="code-snippet-form">
          {/* Language Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="code-lang-select">
              Programming Language
            </label>
            <select
              id="code-lang-select"
              className="form-input code-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Code Textarea */}
          <div className="form-group">
            <label className="form-label" htmlFor="code-text-area">
              Code Content <span className="text-danger">*</span>
            </label>
            <textarea
              id="code-text-area"
              className="code-editor-textarea"
              placeholder="// Paste or write your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={9}
              required
              autoFocus
              spellCheck="false"
            />
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
              disabled={!code.trim()}
            >
              <IconCode size={16} />
              <span>Share Code</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
