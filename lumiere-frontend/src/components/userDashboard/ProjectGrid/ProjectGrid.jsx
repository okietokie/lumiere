import React from 'react';
import ProjectCard from './ProjectCard';
import { COLORS } from '../../../utils/colors';
import './ProjectGrid.css';

const ProjectGrid = ({ projects, loading, onOpen, onDuplicate, onDelete, onRename, onCreateNew }) => {
  if (loading) {
    return (
      <section className="project-grid">
        <div className="section-header">
          <h2 className="section-title">Your Projects</h2>
        </div>
        <div className="project-grid__grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="project-card-skeleton">
              <div className="skeleton" style={{ height: 160 }} />
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 16, width: '70%' }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
                <div className="skeleton" style={{ height: 36, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="project-grid" style={{ animationDelay: '120ms' }}>
      <div className="section-header">
        <h2 className="section-title">
          Your Projects
          <span className="section-count">{projects?.length ?? 0}</span>
        </h2>
        <button className="btn-outline-sm" onClick={onCreateNew}>
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          New
        </button>
      </div>

      {(!projects || projects.length === 0) ? (
        <div className="project-grid__empty">
          <div className="project-grid__empty-icon">
            <svg viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 24h48M24 8v48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="44" cy="44" r="8" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M44 40v8M40 44h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="project-grid__empty-title">No projects yet</p>
          <p className="project-grid__empty-sub">Create your first interior design project to get started.</p>
          <button className="btn-primary" onClick={onCreateNew}>Create First Project</button>
        </div>
      ) : (
        <div className="project-grid__grid">
          {projects.map(p => (
            <ProjectCard
              key={p.id || p._id}
              project={p}
              onOpen={onOpen}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProjectGrid;
