import React, { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`glass-card empty-state-box ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-subtle)',
        background: 'linear-gradient(180deg, rgba(20, 30, 52, 0.6) 0%, rgba(13, 20, 36, 0.7) 100%)',
      }}
    >
      <div
        className="empty-state-icon-bubble"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(6, 182, 212, 0.08) 70%, transparent 100%)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          color: 'var(--neon-cyan)',
          marginBottom: '16px',
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.15)',
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.15rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '6px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          maxWidth: '360px',
          lineHeight: 1.5,
          marginBottom: actionLabel ? '20px' : '0',
        }}
      >
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="btn-primary"
              style={{
                fontSize: '0.86rem',
                padding: '10px 20px',
                minHeight: '40px',
              }}
            >
              {actionIcon}
              <span>{actionLabel}</span>
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="btn-secondary"
              style={{
                fontSize: '0.86rem',
                padding: '10px 18px',
                minHeight: '40px',
              }}
            >
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
