import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Music, Mic, History, Users } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        end
      >
        <div className="nav-icon-wrapper">
          <Home size={20} />
        </div>
        <span>Trang chủ</span>
      </NavLink>

      <NavLink
        to="/my-songs"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-wrapper">
          <Music size={20} />
        </div>
        <span>Bài của tôi</span>
      </NavLink>

      <NavLink
        to="/karaoke"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        style={{
          position: 'relative',
          top: '-6px',
        }}
      >
        <div
          className="nav-icon-wrapper"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px var(--neon-purple-glow)',
          }}
        >
          <Mic size={22} />
        </div>
        <span style={{ fontWeight: 700, color: 'var(--neon-cyan)' }}>Karaoke</span>
      </NavLink>

      <NavLink
        to="/history"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-wrapper">
          <History size={20} />
        </div>
        <span>Lịch sử</span>
      </NavLink>

      <NavLink
        to="/group"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-wrapper">
          <Users size={20} />
        </div>
        <span>Nhóm</span>
      </NavLink>
    </nav>
  );
};
