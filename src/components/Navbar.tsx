import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WifiOff, Cloud, Copy, Check, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentGroup,
    currentMember,
    members,
    setCurrentMember,
    isOnline,
    isCloudConnected,
    showToast
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(false);

  const handleCopyCode = () => {
    if (!currentGroup) return;
    navigator.clipboard.writeText(currentGroup.join_code);
    setCopied(true);
    showToast(`Đã sao chép mã nhóm: ${currentGroup.join_code}`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 16, 26, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 800,
      maxWidth: '100%',
    }}>
      {/* Group Info & Join Code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'var(--grad-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          boxShadow: '0 2px 10px var(--neon-purple-glow)'
        }}>
          🎤
        </div>
        <div>
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            maxWidth: '130px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {currentGroup ? currentGroup.name : 'GinKaraoke'}
          </div>
          {currentGroup && (
            <button
              onClick={handleCopyCode}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--neon-cyan)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Nhấn để sao chép mã nhóm"
            >
              <span>{currentGroup.join_code}</span>
              {copied ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Right Side: Network & Member Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Network / Storage Status */}
        {!isOnline ? (
          <div
            className="badge badge-rose"
            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
            title="Mất mạng - Đang dùng dữ liệu offline bộ nhớ tạm"
          >
            <WifiOff size={12} />
            <span>Offline</span>
          </div>
        ) : isCloudConnected ? (
          <div
            className="badge badge-emerald"
            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
            title="Đã kết nối Supabase Cloud & Realtime"
          >
            <Cloud size={12} />
            <span>Cloud</span>
          </div>
        ) : (
          <div
            className="badge badge-amber"
            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
            title="Chế độ Local Mock (Chưa cấu hình Supabase)"
          >
            <span>Local</span>
          </div>
        )}

        {/* Member Switcher Dropdown */}
        {currentMember && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMemberMenu(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 10px 4px 6px',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{currentMember.avatar || '🎤'}</span>
              <span style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentMember.display_name}
              </span>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {/* Dropdown Menu */}
            {showMemberMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '180px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  padding: '6px',
                  zIndex: 1000,
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>
                  CHỌN BẠN LÀ AI:
                </div>
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCurrentMember(m);
                      setShowMemberMenu(false);
                      showToast(`Đã chuyển sang bạn: ${m.display_name}`, 'info');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: m.id === currentMember.id ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
                      color: m.id === currentMember.id ? 'var(--neon-purple)' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{m.avatar}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.display_name}
                    </span>
                    {m.id === currentMember.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
