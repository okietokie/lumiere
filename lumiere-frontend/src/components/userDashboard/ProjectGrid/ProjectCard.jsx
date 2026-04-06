import React, { useState } from 'react';
import { COLORS } from '../../../utils/colors';
import './ProjectCard.css';

const ProjectCard = ({ project, onOpen, onDuplicate, onDelete, onRename }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <article className="project-card">
      {/* Thumbnail */}
      <div
        className="project-card__thumb"
        onClick={() => onOpen?.(project)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onOpen?.(project)}
      >
        {project.thumbnail
          ? <img src={project.thumbnail} alt={project.name} />
          : (
            <div className="project-card__thumb-placeholder">
              <svg viewBox="0 0 48 48" fill="none">
                <rect x="6" y="6" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 18h36M18 6v36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="24" cy="30" r="5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
          )
        }
        <div className="project-card__thumb-overlay">
          <span>Open</span>
        </div>
      </div>

      {/* Body */}
      <div className="project-card__body">
        <div className="project-card__top">
          <h3 className="project-card__name">{project.name}</h3>

          {/* Context menu */}
          <div className="project-card__menu-wrap">
            <button
              className="project-card__menu-btn"
              onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
              aria-label="More options"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="project-card__context-menu">
                <button onClick={() => { onOpen?.(project); setMenuOpen(false); }}>Open</button>
                <button onClick={() => { onRename?.(project); setMenuOpen(false); }}>Rename</button>
                <button onClick={() => { onDuplicate?.(project); setMenuOpen(false); }}>Duplicate</button>
                <div className="context-menu-divider" />
                <button
                  className="context-menu-danger"
                  onClick={() => { onDelete?.(project); setMenuOpen(false); }}
                >Delete</button>
              </div>
            )}
          </div>
        </div>

        <div className="project-card__meta">
          <span>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12v10H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            {project.rooms_count ?? 0} rooms
          </span>
          <span>
            <svg viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {formatDate(project.last_modified)}
          </span>
        </div>

        <button className="project-card__open-btn" onClick={() => onOpen?.(project)}>
          Open Project
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </article>
  );
};

export default ProjectCard;
