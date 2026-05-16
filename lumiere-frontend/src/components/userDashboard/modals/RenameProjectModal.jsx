import React, { useEffect, useRef, useState } from 'react';
import './Modal.css';

const RenameProjectModal = ({ open, onClose, onConfirm, project }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setName(project?.name ?? '');
    setError('');
    setLoading(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);
  }, [open, project]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    if (trimmedName === (project?.name ?? '').trim()) {
      onClose?.();
      return;
    }

    setLoading(true);
    try {
      await onConfirm?.(project, trimmedName);
      onClose?.();
    } catch (e) {
      setError(e?.message ?? 'Failed to rename project.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-project-title"
      >
        <div className="modal__header">
          <div className="modal__header-copy">
            <span className="modal__eyebrow">Project</span>
            <h2 id="rename-project-title">Rename Project</h2>
            <p className="modal__subtitle">
              Update the project name so it feels polished and stays easy to find from your dashboard.
            </p>
          </div>

          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__intro-card">
            <div className="modal__intro-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M5 14.5L14.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M12.5 5H14.5V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 15.5L7.5 15L5 12.5L4.5 15.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="modal__intro-text">
              <strong>Choose a clear, client-friendly name</strong>
              <p>Short, descriptive names look more professional in project cards, recent activity, and shared workflows.</p>
            </div>
          </div>

          <div className="modal__form-grid">
            <div className="form-field form-field--primary">
              <label htmlFor="rename-project-name">
                Project Name <span>*</span>
              </label>
              <input
                id="rename-project-name"
                ref={inputRef}
                type="text"
                placeholder="e.g. Penthouse Living Room"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                maxLength={80}
              />
              <span className="form-field__hint">{name.trim().length}/80 characters</span>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal__footer">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? <span className="spinner" /> : 'Save Name'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameProjectModal;
