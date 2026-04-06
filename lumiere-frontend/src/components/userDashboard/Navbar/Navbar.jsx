import React, { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../../utils/colors';
import './Navbar.css';

const Navbar = ({ user, onLogout, onSearch }) => {
  const [searchVal, setSearchVal]     = useState('');
  const [dropOpen,  setDropOpen]      = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const dropRef  = useRef(null);
  const notifRef = useRef(null);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  setDropOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchVal);
  };

  const notifications = [
    { id: 1, msg: 'Project saved successfully', read: false, time: '2m ago' },
    { id: 2, msg: 'New platform update available', read: false, time: '1h ago' },
    { id: 3, msg: 'Storage limit nearing 80%', read: true,  time: '3h ago' },
  ];
  const unread = notifications.filter(n => !n.read).length;

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar__brand">
        <span className="navbar__logo-icon">✦</span>
        <span className="navbar__brand-text">
          <span className="navbar__brand-light">Lumière</span>
          <span className="navbar__brand-serif"> Maison</span>
        </span>
      </div>

      {/* Search */}
      <form className="navbar__search" onSubmit={handleSearch}>
        <svg className="navbar__search-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search projects & rooms…"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
        />
      </form>

      {/* Right actions */}
      <div className="navbar__actions">
        {/* Notifications */}
        <div className="navbar__notif-wrap" ref={notifRef}>
          <button
            className="navbar__icon-btn"
            onClick={() => setNotifOpen(o => !o)}
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            {unread > 0 && <span className="navbar__badge">{unread}</span>}
          </button>

          {notifOpen && (
            <div className="navbar__dropdown navbar__notif-dropdown">
              <p className="navbar__dropdown-title">Notifications</p>
              {notifications.map(n => (
                <div key={n.id} className={`navbar__notif-item${n.read ? ' read' : ''}`}>
                  <span className="navbar__notif-dot" />
                  <div>
                    <p>{n.msg}</p>
                    <span>{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="navbar__profile-wrap" ref={dropRef}>
          <button
            className="navbar__avatar-btn"
            onClick={() => setDropOpen(o => !o)}
            aria-label="Profile menu"
          >
            <div className="navbar__avatar">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} />
                : <span>{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
              }
            </div>
            <span className="navbar__user-name">{user?.name ?? 'User'}</span>
            <svg className="navbar__chevron" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4"/>
            </svg>
          </button>

          {dropOpen && (
            <div className="navbar__dropdown">
              <a href="/profile" className="navbar__drop-item">
                <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Profile
              </a>
              <a href="/settings" className="navbar__drop-item">
                <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Settings
              </a>
              <div className="navbar__drop-divider" />
              <button className="navbar__drop-item navbar__drop-logout" onClick={onLogout}>
                <svg viewBox="0 0 20 20" fill="none"><path d="M7 17H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M13 14l3-4-3-4M16 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
