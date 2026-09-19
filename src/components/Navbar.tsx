import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Check, ChevronDown, Cloud, Copy, History, Home, LogOut, Mic, Music, Users, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GinKaraokeLogo } from './GinKaraokeLogo';
import { MemberAvatar } from './MemberAvatar';

export function Navbar() {
  const { currentGroup, groups, profile, isOnline, selectGroup, signOut, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!currentGroup) return;
    try {
      await navigator.clipboard.writeText(currentGroup.join_code);
      setCopied(true);
      showToast('Đã sao chép mã tham gia nhóm! 📋', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Không thể sao chép mã.', 'error');
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Brand & Active Group Lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <GinKaraokeLogo size="sm" glow={true} />
          </NavLink>

          <button
            className="brand-button"
            onClick={() => void copyCode()}
            aria-label="Sao chép mã nhóm"
            title="Nhấn để sao chép mã nhóm"
          >
            <div>
              <strong>{currentGroup?.name ?? 'GinKaraoke'}</strong>
              <small>
                <span>{currentGroup?.join_code}</span>
                {copied ? (
                  <Check size={12} color="var(--emerald-400)" />
                ) : (
                  <Copy size={11} style={{ opacity: 0.7 }} />
                )}
              </small>
            </div>
          </button>
        </div>

        {/* Center Desktop Navigation Bar (>=1024px) */}
        <nav className="desktop-nav" aria-label="Điều hướng desktop">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            <Home size={17} />
            <span>Trang chủ</span>
          </NavLink>

          <NavLink
            to="/my-songs"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            <Music size={17} />
            <span>Bài của tôi</span>
          </NavLink>

          <NavLink
            to="/karaoke"
            className={({ isActive }) => `desktop-nav-link mic-link ${isActive ? 'active' : ''}`}
          >
            <Mic size={17} />
            <span>Phòng Karaoke</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            <History size={17} />
            <span>Lịch sử</span>
          </NavLink>

          <NavLink
            to="/group"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            <Users size={17} />
            <span>Hội bạn</span>
          </NavLink>
        </nav>

        {/* Right Topbar Actions */}
        <div className="topbar-actions">
          {/* Connectivity Status Badge */}
          <span
            className={`badge ${isOnline ? 'badge-emerald' : 'badge-rose'}`}
            style={{ cursor: 'default' }}
            title={isOnline ? 'Đã đồng bộ với Cloud' : 'Chế độ ngoại tuyến - Chỉ đọc'}
          >
            {isOnline ? <Cloud size={12} /> : <WifiOff size={12} />}
            <span className="hide-on-mobile-sm">{isOnline ? 'Cloud' : 'Offline'}</span>
          </span>

          {/* Account Menu */}
          <div className="account-menu">
            <button
              className="account-button"
              onClick={() => setOpen(val => !val)}
              aria-expanded={open}
              aria-label="Tài khoản cá nhân"
            >
              <MemberAvatar profile={profile} size="xs" />
              <span>{profile?.display_name?.split(' ')[0] ?? 'Tôi'}</span>
              <ChevronDown
                size={14}
                style={{
                  transform: open ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {open && (
              <div className="dropdown" onClick={e => e.stopPropagation()}>
                {/* Profile summary */}
                <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {profile?.display_name}
                  </p>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {currentGroup?.name}
                  </p>
                </div>

                {/* Group Switcher */}
                {groups.length > 1 && (
                  <div style={{ padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <p className="dropdown-label">CHUYỂN NHÓM ({groups.length})</p>
                    {groups.map(group => (
                      <button
                        key={group.id}
                        onClick={() => {
                          void selectGroup(group);
                          setOpen(false);
                        }}
                        style={{
                          color: group.id === currentGroup?.id ? 'var(--neon-cyan)' : 'var(--text-primary)',
                          fontWeight: group.id === currentGroup?.id ? 700 : 500,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                            {group.name}
                          </span>
                        </span>
                        {group.id === currentGroup?.id && <Check size={14} color="var(--neon-cyan)" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Logout */}
                <div style={{ paddingTop: '4px' }}>
                  <button
                    className="danger-text"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LogOut size={14} />
                      <span>Đăng xuất</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
