import React, { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../../utils/colors';
import './Modal.css';

const CreateProjectModal = ({ open, onClose, onCreate }) => {
  const [name, setName]         = useState('');
  const [description, setDesc]  = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(''); setDesc(''); setError('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Project name is required.'); return; }
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
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2>New Project</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal__body">
          <div className="form-field">
            <label htmlFor="proj-name">Project Name <span>*</span></label>
            <input
              id="proj-name"
              ref={inputRef}
              type="text"
              placeholder="e.g. Modern Living Room"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={80}
            />
          </div>
          <div className="form-field">
            <label htmlFor="proj-desc">Description <span className="optional">(optional)</span></label>
            <textarea
              id="proj-desc"
              placeholder="Brief description of the project…"
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              maxLength={300}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal__footer">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? <span className="spinner" /> : (
              <>
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
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
