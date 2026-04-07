import React, { useEffect, useRef, useState } from 'react';
import './ProjectCard.css';

const ProjectCard = ({ project, onOpen, onDuplicate, onDelete, onRename }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const status = (project.rooms_count ?? 0) > 0 ? 'Active' : 'Draft';
  const previewLabel = (project.name ?? 'Project').trim().charAt(0).toUpperCase() || 'P';

  return (
    <article className="project-card">
      <div
        className="project-card__thumb"
        onClick={() => onOpen?.(project)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen?.(project)}
      >
        {project.thumbnail
          ? <img src={project.thumbnail} alt={project.name} />
          : (
            <div className="project-card__thumb-placeholder">
              <div className="project-card__preview-scene">
                <div className="project-card__preview-grid" />
                <div className="project-card__preview-room project-card__preview-room--main" />
                <div className="project-card__preview-room project-card__preview-room--side" />
                <div className="project-card__preview-pill">
                  <span>{previewLabel}</span>
                </div>
                <div className="project-card__preview-meta">
                  <span>{project.rooms_count ?? 0} rooms</span>
                  <span>{status}</span>
                </div>
              </div>
            </div>
          )}
        <div className="project-card__thumb-overlay">
          <span>Open</span>
        </div>
      </div>

      <div className="project-card__body">
        <div className="project-card__status-row">
          <span className={`project-card__status ${(project.rooms_count ?? 0) > 0 ? 'is-active' : 'is-draft'}`}>{status}</span>
          <span className="project-card__date-chip">{formatDate(project.last_modified)}</span>
        </div>

        <div className="project-card__top">
          <h3 className="project-card__name">{project.name}</h3>

          <div className="project-card__menu-wrap" ref={menuRef}>
            <button
              className="project-card__menu-btn"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((open) => !open); }}
              aria-label="More options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="4" r="1.2" /><circle cx="10" cy="10" r="1.2" /><circle cx="10" cy="16" r="1.2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="project-card__context-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { onOpen?.(project); setMenuOpen(false); }}>Open</button>
                <button type="button" role="menuitem" onClick={() => { onRename?.(project); setMenuOpen(false); }}>Rename</button>
                <button type="button" role="menuitem" onClick={() => { onDuplicate?.(project); setMenuOpen(false); }}>Duplicate</button>
                <div className="context-menu-divider" />
                <button
                  type="button"
                  role="menuitem"
                  className="context-menu-danger"
                  onClick={() => { onDelete?.(project); setMenuOpen(false); }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="project-card__meta">
          <span>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12v10H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            {project.rooms_count ?? 0} rooms
          </span>
          <span>
            <svg viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Last updated
          </span>
        </div>

        <button className="project-card__open-btn" onClick={() => onOpen?.(project)}>
          <span className="project-card__open-btn-text">Open Project</span>
          <span className="project-card__open-btn-icon">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </article>
  );
};

export default ProjectCard;
