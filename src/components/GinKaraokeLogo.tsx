import React from 'react';

interface GinKaraokeLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  subtitle?: string;
  className?: string;
  glow?: boolean;
}

const sizeMap = {
  xs: { icon: 26, text: '1.02rem', sub: '0.62rem' },
  sm: { icon: 34, text: '1.2rem', sub: '0.68rem' },
  md: { icon: 46, text: '1.48rem', sub: '0.75rem' },
  lg: { icon: 60, text: '1.88rem', sub: '0.85rem' },
  xl: { icon: 84, text: '2.4rem', sub: '0.98rem' },
};

export const GinKaraokeLogo: React.FC<GinKaraokeLogoProps> = ({
  size = 'md',
  withText = false,
  subtitle,
  className = '',
  glow = true,
}) => {
  const { icon: px, text: textSize, sub: subSize } = sizeMap[size];

  return (
    <div
      className={`ginkaraoke-brand-lockup ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: withText ? Math.max(10, px * 0.22) : 0,
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <div
        className="brand-logo-icon-container"
        style={{
          width: px,
          height: px,
          flexShrink: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: glow
            ? 'drop-shadow(0 0 10px rgba(0, 242, 254, 0.45)) drop-shadow(0 0 18px rgba(168, 85, 247, 0.35))'
            : 'none',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="GinKaraoke Logo"
          width={px}
          height={px}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '50%',
            display: 'block',
          }}
          loading="eager"
        />
      </div>

      {withText && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.15 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: textSize,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#ffffff' }}>Gin</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #00f2fe 0%, #a855f7 70%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Karaoke
            </span>
          </div>
          {subtitle && (
            <span
              style={{
                fontSize: subSize,
                color: 'var(--cyan-400)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginTop: '2px',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
