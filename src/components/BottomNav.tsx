import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Music, Mic, History, Users } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {/* 1. Trang chủ */}
      <NavLink
        to="/"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        end
        aria-label="Trang chủ"
      >
        <div className="nav-icon-wrapper">
          <Home size={20} />
        </div>
        <span>Trang chủ</span>
      </NavLink>

      {/* 2. Bài của tôi */}
      <NavLink
        to="/my-songs"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        aria-label="Bài của tôi"
      >
        <div className="nav-icon-wrapper">
          <Music size={20} />
        </div>
        <span>Bài của tôi</span>
      </NavLink>

      {/* 3. Karaoke (Centerpiece Action Button) */}
      <NavLink
        to="/karaoke"
        className={({ isActive }) => `bottom-nav-center-item ${isActive ? 'active' : ''}`}
        aria-label="Phòng Karaoke"
      >
        <div className="bottom-nav-center-bubble">
          <Mic size={24} />
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--neon-cyan)',
            marginTop: '2px',
            letterSpacing: '0.02em',
          }}
        >
          Karaoke
        </span>
      </NavLink>

      {/* 4. Lịch sử */}
      <NavLink
        to="/history"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        aria-label="Lịch sử buổi hát"
      >
        <div className="nav-icon-wrapper">
          <History size={20} />
        </div>
        <span>Lịch sử</span>
      </NavLink>

      {/* 5. Nhóm */}
      <NavLink
        to="/group"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        aria-label="Nhóm của tôi"
      >
        <div className="nav-icon-wrapper">
          <Users size={20} />
        </div>
        <span>Nhóm</span>
      </NavLink>
    </nav>
  );
};
