import React from 'react';
import { COLORS } from '../../../utils/colors';
import './RecentActivity.css';

const ACTION_ICONS = {
  created:  <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  edited:   <svg viewBox="0 0 16 16" fill="none"><path d="M11.7 2.3a1 1 0 0 1 2 0l0 0a1 1 0 0 1 0 1.4L4.4 13H2v-2.4L11.7 2.3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  deleted:  <svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M5 4V3h6v1M6 7v4M10 7v4M4 4l.7 9h6.6L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  uploaded: <svg viewBox="0 0 16 16" fill="none"><path d="M8 11V3M5 6l3-3 3 3M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  added:    <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5.5v5M5.5 8h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

const RecentActivity = ({ activities, loading }) => {
  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <section className="activity" style={{ animationDelay: '180ms' }}>
      <div className="section-header">
        <h2 className="section-title">Recent Activity</h2>
      </div>

      <div className="activity__list">
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="activity__item activity__item--skeleton">
            <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ height: 12, width: '65%' }} />
              <div className="skeleton" style={{ height: 10, width: '30%' }} />
            </div>
          </div>
        ))}

        {!loading && activities?.length === 0 && (
          <div className="activity__empty">
            <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.4"/><path d="M16 10v6.5l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>No recent activity</span>
          </div>
        )}

        {!loading && activities?.map((a, i) => (
          <div
            key={a.id || i}
            className="activity__item"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={`activity__icon activity__icon--${a.type ?? 'edited'}`}>
              {ACTION_ICONS[a.type] ?? ACTION_ICONS.edited}
            </div>
            <div className="activity__body">
              <p className="activity__text">
                <span className="activity__action">{a.action}</span>
                {a.target && <> <span className="activity__target">"{a.target}"</span></>}
                {a.project_name && <span className="activity__proj"> in {a.project_name}</span>}
              </p>
              <span className="activity__time">{formatTime(a.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentActivity;
