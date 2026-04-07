import React from 'react';
import './QuickActions.css';

const ACTIONS = [
  {
    id: 'new-project',
    label: 'New Project',
    desc: 'Start a fresh design',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'upload-plan',
    label: 'Upload Floor Plan',
    desc: 'Import from file',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'create-room',
    label: 'Create Empty Room',
    desc: 'Design from scratch',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'import-room',
    label: 'Import Room File',
    desc: 'Load existing layout',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const QuickActions = ({ onAction }) => (
  <section className="quick-actions" style={{ animationDelay: '60ms' }}>
    <h2 className="section-title">Quick Actions</h2>
    <div className="quick-actions__grid">
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          className="qa-card"
          onClick={() => onAction?.(a.id)}
        >
          <div className="qa-card__icon">{a.icon}</div>
          <div className="qa-card__text">
            <span className="qa-card__label">{a.label}</span>
            <span className="qa-card__desc">{a.desc}</span>
          </div>
          <svg className="qa-card__arrow" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ))}
    </div>
  </section>
);

export default QuickActions;
