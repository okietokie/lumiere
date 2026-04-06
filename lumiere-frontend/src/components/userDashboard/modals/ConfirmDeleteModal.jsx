import React, { useState } from 'react';
import './Modal.css';
import './ConfirmDeleteModal.css';

const ConfirmDeleteModal = ({ open, onClose, onConfirm, project }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm?.(project); onClose(); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--sm" role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2>Delete Project</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="modal__body">
          <div className="confirm-delete__icon">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M8 8l16 16M24 8L8 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="confirm-delete__msg">
            Are you sure you want to delete <strong>"{project?.name}"</strong>?
            This will permanently remove all rooms and assets inside it.
          </p>
        </div>
        <div className="modal__footer">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
