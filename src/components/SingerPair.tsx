import React from 'react';
import { Zap } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import type { Profile } from '../types';

interface SingerPairProps {
  singer1?: Profile | { id?: string; display_name: string; avatar_url?: string | null } | null;
  singer2?: Profile | { id?: string; display_name: string; avatar_url?: string | null } | null;
  singer1Name?: string;
  singer2Name?: string;
  size?: 'sm' | 'md' | 'lg';
  isSpotlight?: boolean;
  className?: string;
}

export const SingerPair: React.FC<SingerPairProps> = ({
  singer1,
  singer2,
  singer1Name,
  singer2Name,
  size = 'md',
  isSpotlight = false,
  className = '',
}) => {
  const name1 = singer1Name ?? singer1?.display_name ?? 'Ca sĩ 1';
  const name2 = singer2Name ?? singer2?.display_name ?? 'Ca sĩ 2';

  const avatarSize = isSpotlight ? 'lg' : size === 'lg' ? 'md' : size === 'sm' ? 'xs' : 'sm';

  return (
    <div
      className={`singer-pair-container ${isSpotlight ? 'singer-pair-spotlight' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSpotlight ? '12px' : size === 'sm' ? '6px' : '8px',
        maxWidth: '100%',
      }}
    >
      {/* Singer 1 */}
      <div
        className="singer-chip singer-1"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isSpotlight ? '8px' : '6px',
          minWidth: 0,
          background: isSpotlight ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.05)',
          border: isSpotlight ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-full)',
          padding: isSpotlight ? '4px 12px 4px 4px' : '3px 9px 3px 3px',
          transition: 'all 0.2s ease',
        }}
      >
        <MemberAvatar profile={singer1} name={name1} size={avatarSize} />
        <span
          className="singer-name"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isSpotlight ? '0.96rem' : size === 'sm' ? '0.74rem' : '0.82rem',
            fontWeight: 700,
            color: isSpotlight ? 'var(--neon-cyan)' : 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: isSpotlight ? '120px' : '90px',
          }}
          title={name1}
        >
          {name1}
        </span>
      </div>

      {/* Visual Duet Bridge Connector */}
      <div
        className="duet-bridge"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {isSpotlight ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(168, 85, 247, 0.4) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.6)',
              boxShadow: '0 0 14px var(--neon-purple-glow)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            <Zap size={13} fill="currentColor" color="var(--neon-cyan)" />
            <span>DUO</span>
          </div>
        ) : (
          <div
            style={{
              width: size === 'sm' ? '20px' : '24px',
              height: size === 'sm' ? '20px' : '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(168, 85, 247, 0.25) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              color: 'var(--neon-purple)',
              fontSize: size === 'sm' ? '0.68rem' : '0.75rem',
              fontWeight: 800,
            }}
          >
            {size === 'sm' ? '+' : <Zap size={11} fill="currentColor" />}
          </div>
        )}
      </div>

      {/* Singer 2 */}
      <div
        className="singer-chip singer-2"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isSpotlight ? '8px' : '6px',
          minWidth: 0,
          background: isSpotlight ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.05)',
          border: isSpotlight ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-full)',
          padding: isSpotlight ? '4px 12px 4px 4px' : '3px 9px 3px 3px',
          transition: 'all 0.2s ease',
        }}
      >
        <MemberAvatar profile={singer2} name={name2} size={avatarSize} />
        <span
          className="singer-name"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isSpotlight ? '0.96rem' : size === 'sm' ? '0.74rem' : '0.82rem',
            fontWeight: 700,
            color: isSpotlight ? 'var(--neon-purple)' : 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: isSpotlight ? '120px' : '90px',
          }}
          title={name2}
        >
          {name2}
        </span>
      </div>
    </div>
  );
};
