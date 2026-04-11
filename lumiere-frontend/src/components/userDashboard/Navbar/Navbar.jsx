import React, { useState, useRef, useEffect } from 'react';
import './Navbar.css';

const Navbar = ({ user, onLogout, onSearch }) => {
  const [searchVal, setSearchVal] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropRef = useRef(null);
  const notifRef = useRef(null);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
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
    { id: 1, msg: 'Render completed: Residence No. 12', read: false, time: '2m ago' },
    { id: 2, msg: 'New AI layout suggestions available', read: false, time: '1h ago' },
    { id: 3, msg: 'Project auto-saved', read: true, time: '3h ago' },
  ];
  const unread = notifications.filter(n => !n.read).length;

  return (
    <nav className="flex items-center justify-between w-full h-[80px] px-8 bg-transparent">
      {/* Search Bar */}
      <form 
        className="flex items-center bg-[#171514] border border-white/5 rounded-full px-4 py-2 w-[400px] shadow-sm transition-colors focus-within:border-[#dcab77]/50 focus-within:bg-[#1a1817]" 
        onSubmit={handleSearch}
      >
        <svg className="w-4 h-4 text-white/40" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className="bg-transparent border-none outline-none text-white/90 text-sm ml-3 w-full placeholder-white/30"
          placeholder="Search projects, assets, or inspiration..."
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
        />
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            className="text-white/60 hover:text-white transition-colors relative"
            onClick={() => setNotifOpen(o => !o)}
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            {unread > 0 && <span className="absolute -top-1 -right-1 bg-[#dcab77] text-[#11100f] text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">{unread}</span>}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-4 w-72 bg-[#171514] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest px-3 py-2">Notifications</p>
              {notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#dcab77]'}`} />
                  <div>
                    <p className="text-sm text-white/90">{n.msg}</p>
                    <span className="text-xs text-white/40">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grid Icon (Placeholder for apps) */}
        <button className="text-white/60 hover:text-white transition-colors">
           <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
             <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
             <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
             <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
             <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
           </svg>
        </button>

        {/* Profile */}
        <div className="relative border-l border-white/10 pl-6" ref={dropRef}>
          <button
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={() => setDropOpen(o => !o)}
            aria-label="Profile menu"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm text-white font-medium leading-tight">{user?.name ?? 'Alex Mercer'}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Senior Designer</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#171514] to-[#2c2825] border border-white/10 overflow-hidden flex items-center justify-center text-white/70">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : <span className="font-serif italic text-lg">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
              }
            </div>
          </button>

          {dropOpen && (
            <div className="absolute right-0 mt-4 w-48 bg-[#171514] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
              <a href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Profile
              </a>
              <a href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Settings
              </a>
              <div className="h-px bg-white/10 my-2" />
              <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors" onClick={onLogout}>
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
