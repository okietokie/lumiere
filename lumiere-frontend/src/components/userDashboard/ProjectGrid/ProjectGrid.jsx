import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import ProjectCard from './ProjectCard';
import './ProjectGrid.css';

const ProjectGrid = ({ projects, loading, onOpen, onDuplicate, onDelete, onRename, onCreateNew }) => {
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const gridRef = useRef(null);

  const visibleProjects = useMemo(() => {
    const filtered = [...(projects ?? [])].filter((project) => {
      if (filterBy === 'rooms') return (project.rooms_count ?? 0) > 0;
      if (filterBy === 'drafts') return (project.rooms_count ?? 0) === 0;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      if (sortBy === 'rooms') return (b.rooms_count ?? 0) - (a.rooms_count ?? 0);
      return new Date(b.last_modified ?? 0).getTime() - new Date(a.last_modified ?? 0).getTime();
    });

    return filtered;
  }, [filterBy, projects, sortBy]);

  useLayoutEffect(() => {
    if (loading) return undefined;
    const grid = gridRef.current;
    if (!grid) return undefined;

    const items = grid.querySelectorAll('.project-card');
    if (!items.length) return undefined;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(
      items,
      { autoAlpha: 0, y: 22, scale: 0.98, transformOrigin: 'center top' },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.05 }
    );

    return () => {
      tl.kill();
    };
  }, [filterBy, sortBy, visibleProjects, loading]);

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
        <div className="project-grid__toolbar">
          <div className="project-grid__pill-group">
            <button className={`project-grid__pill${filterBy === 'all' ? ' is-active' : ''}`} onClick={() => setFilterBy('all')}>All</button>
            <button className={`project-grid__pill${filterBy === 'rooms' ? ' is-active' : ''}`} onClick={() => setFilterBy('rooms')}>With rooms</button>
            <button className={`project-grid__pill${filterBy === 'drafts' ? ' is-active' : ''}`} onClick={() => setFilterBy('drafts')}>Drafts</button>
          </div>
          <div className="project-grid__toolbar-actions">
            <label className="project-grid__sort">
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Most recent</option>
                <option value="name">Name</option>
                <option value="rooms">Most rooms</option>
              </select>
            </label>
            <button className="btn-outline-sm" onClick={onCreateNew}>
              <span className="btn-outline-sm__icon">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="btn-outline-sm__text">New</span>
            </button>
          </div>
        </div>
      </div>

      {(!projects || projects.length === 0) ? (
        <div className="project-grid__empty">
          <div className="project-grid__empty-icon">
            <svg viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 24h48M24 8v48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="44" cy="44" r="8" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
              <path d="M44 40v8M40 44h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="project-grid__empty-title">No projects yet</p>
          <p className="project-grid__empty-sub">Create your first interior design project to get started.</p>
          <button className="btn-primary btn-primary--cta" onClick={onCreateNew}>
            <span className="btn-primary--cta__text">Create First Project</span>
          </button>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="project-grid__empty project-grid__empty--compact">
          <p className="project-grid__empty-title">No projects match this view</p>
          <p className="project-grid__empty-sub">Try another filter or create a fresh project.</p>
        </div>
      ) : (
        <div className="project-grid__grid" ref={gridRef}>
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id || project._id}
              project={project}
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
