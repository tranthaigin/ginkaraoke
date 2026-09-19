import React, { type ReactNode } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'primary',
  icon,
  onConfirm,
  onCancel,
  isBusy = false,
}) => {
  if (!isOpen) return null;

  const defaultIcon =
    variant === 'danger' ? (
      <AlertCircle size={28} color="var(--neon-rose)" />
    ) : variant === 'warning' ? (
      <AlertCircle size={28} color="var(--neon-amber)" />
    ) : (
      <HelpCircle size={28} color="var(--neon-cyan)" />
    );

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        role="alertdialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          textAlign: 'center',
          padding: '28px 22px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            background:
              variant === 'danger'
                ? 'rgba(244, 63, 94, 0.15)'
                : variant === 'warning'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(6, 182, 212, 0.15)',
            border:
              variant === 'danger'
                ? '1px solid rgba(244, 63, 94, 0.4)'
                : variant === 'warning'
                ? '1px solid rgba(245, 158, 11, 0.4)'
                : '1px solid rgba(6, 182, 212, 0.4)',
          }}
        >
          {icon ?? defaultIcon}
        </div>

        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '22px',
          }}
        >
          {description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isBusy}
            style={{ width: '100%', minHeight: '44px' }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={isBusy}
            style={{
              width: '100%',
              minHeight: '44px',
              ...(variant === 'danger'
                ? {
                    background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                    boxShadow: '0 4px 15px rgba(225, 29, 72, 0.35)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }
                : {}),
            }}
          >
            {isBusy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
