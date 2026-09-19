import React, { useMemo } from 'react';
import type { Profile } from '../types';

interface MemberAvatarProps {
  profile?: Profile | { display_name?: string; avatar_url?: string | null } | null;
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  selected?: boolean;
  status?: 'online' | 'offline' | 'singing' | null;
  turnCount?: number;
  className?: string;
  onClick?: () => void;
}

const sizeConfig = {
  xs: { size: 24, font: '0.62rem', border: 1.5, badge: 14, badgeFont: '0.55rem' },
  sm: { size: 32, font: '0.75rem', border: 2, badge: 16, badgeFont: '0.6rem' },
  md: { size: 40, font: '0.88rem', border: 2, badge: 18, badgeFont: '0.68rem' },
  lg: { size: 52, font: '1.1rem', border: 2.5, badge: 22, badgeFont: '0.72rem' },
  xl: { size: 68, font: '1.4rem', border: 3, badge: 26, badgeFont: '0.8rem' },
};

// Deterministic vibrant palettes for fallback initials
const gradients = [
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)',
];

function getInitials(displayName?: string): string {
  if (!displayName || !displayName.trim()) return '🎤';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  profile,
  name,
  avatarUrl,
  size = 'md',
  selected = false,
  status,
  turnCount,
  className = '',
  onClick,
}) => {
  const displayName = name ?? profile?.display_name ?? 'Ca sĩ';
  const resolvedUrl = avatarUrl ?? profile?.avatar_url;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const cfg = sizeConfig[size];

  // Hash the display name to pick a stable colorful gradient
  const gradientIndex = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < displayName.length; i++) {
      hash = (hash << 5) - hash + displayName.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % gradients.length;
  }, [displayName]);

  const bgGradient = gradients[gradientIndex];

  return (
    <div
      className={`member-avatar-wrapper ${selected ? 'is-selected' : ''} ${className}`}
      onClick={onClick}
      style={{
        position: 'relative',
        width: cfg.size,
        height: cfg.size,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: '50%',
      }}
      title={displayName}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          background: bgGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: selected
            ? '0 0 0 2px var(--bg-surface), 0 0 0 4px var(--neon-cyan), 0 0 12px var(--neon-cyan-glow)'
            : '0 2px 6px rgba(0, 0, 0, 0.4)',
          border: selected ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={e => {
              // On broken image, hide the image and fallback to initials
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span
            style={{
              color: '#ffffff',
              fontFamily: 'var(--font-display)',
              fontSize: cfg.font,
              fontWeight: 800,
              letterSpacing: '0.02em',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
            }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Optional Turn Count Indicator Badge */}
      {turnCount !== undefined && (
        <span
          className="turn-count-badge"
          style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            minWidth: cfg.badge,
            height: cfg.badge,
            padding: '0 4px',
            borderRadius: '9999px',
            background: 'var(--grad-primary)',
            color: '#ffffff',
            fontSize: cfg.badgeFont,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid var(--bg-surface)',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.5)',
          }}
          title={`${turnCount} lượt hát`}
        >
          {turnCount}
        </span>
      )}

      {/* Optional Status dot */}
      {status && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: Math.max(8, cfg.size * 0.25),
            height: Math.max(8, cfg.size * 0.25),
            borderRadius: '50%',
            backgroundColor:
              status === 'singing'
                ? 'var(--neon-purple)'
                : status === 'online'
                ? 'var(--neon-emerald)'
                : 'var(--text-muted)',
            border: '1.5px solid var(--bg-surface)',
            boxShadow:
              status === 'singing'
                ? '0 0 8px var(--neon-purple)'
                : status === 'online'
                ? '0 0 6px var(--neon-emerald)'
                : 'none',
          }}
        />
      )}
    </div>
  );
};
