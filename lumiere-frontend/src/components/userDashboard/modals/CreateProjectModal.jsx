import React, { useState, useRef, useEffect } from 'react';
import './Modal.css';

const CreateProjectModal = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName('');
      setDesc('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setLoading(true);
    try {
      await onCreate?.({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (e) {
      setError(e.message ?? 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--create-project" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
        <div className="modal__header">
          <div className="modal__header-copy">
            <span className="modal__eyebrow">Overview</span>
            <h2 id="create-project-title">Create New Project</h2>
            <p className="modal__subtitle">
              Set up the project shell now, then add rooms, assets, and design details as work develops.
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
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="modal__intro-text">
              <strong>Give it a clear, recognizable name</strong>
              <p>That makes it easier to spot later in the dashboard, project list, and recent activity.</p>
            </div>
          </div>

          <div className="modal__form-grid">
            <div className="form-field form-field--primary">
              <label htmlFor="proj-name">
                Project Name <span>*</span>
              </label>
              <input
                id="proj-name"
                ref={inputRef}
                type="text"
                placeholder="e.g. Modern Living Room"
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

            <div className="form-field">
              <label htmlFor="proj-desc">
                Description <span className="optional">(optional)</span>
              </label>
              <textarea
                id="proj-desc"
                placeholder="Brief description of the project..."
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                maxLength={300}
              />
              <span className="form-field__hint">{description.trim().length}/300 characters</span>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal__footer">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Create Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
