import React from 'react';

interface EqualizerIconProps {
  animated?: boolean;
  barCount?: 3 | 4 | 5;
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'purple' | 'multi';
  className?: string;
}

export const EqualizerIcon: React.FC<EqualizerIconProps> = ({
  animated = true,
  barCount = 4,
  size = 'md',
  color = 'multi',
  className = '',
}) => {
  const heights = {
    sm: { h: 14, w: 2.5, gap: 2 },
    md: { h: 18, w: 3, gap: 2.5 },
    lg: { h: 26, w: 4, gap: 3 },
  }[size];

  const barColors = {
    cyan: ['var(--neon-cyan)', 'var(--neon-cyan)', 'var(--neon-cyan)', 'var(--neon-cyan)', 'var(--neon-cyan)'],
    purple: ['var(--neon-purple)', 'var(--neon-purple)', 'var(--neon-purple)', 'var(--neon-purple)', 'var(--neon-purple)'],
    multi: ['#00f2fe', '#38bdf8', '#818cf8', '#c084fc', '#ec4899'],
  }[color];

  return (
    <div
      className={`equalizer-bars ${animated ? 'is-animated' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: `${heights.gap}px`,
        height: `${heights.h}px`,
        verticalAlign: 'middle',
      }}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className={`eq-bar eq-bar-${i + 1}`}
          style={{
            width: `${heights.w}px`,
            height: '100%',
            backgroundColor: barColors[i % barColors.length],
            borderRadius: '9999px',
            transformOrigin: 'bottom',
            boxShadow: `0 0 6px ${barColors[i % barColors.length]}66`,
          }}
        />
      ))}
    </div>
  );
};
