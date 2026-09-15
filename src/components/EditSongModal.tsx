import React, { useState } from 'react';
import { MemberSong, Priority } from '../types';
import { MemberSongRepo } from '../repositories';
import { useApp } from '../context/AppContext';
import { X, Star, Flame, Music, Trash2, Check } from 'lucide-react';

interface EditSongModalProps {
  memberSong: MemberSong | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSongModal: React.FC<EditSongModalProps> = ({ memberSong, onClose, onSuccess }) => {
  const { showToast } = useApp();

  const [priority, setPriority] = useState<Priority>(memberSong?.priority || 'NORMAL');
  const [favorite, setFavorite] = useState<boolean>(memberSong?.favorite || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!memberSong) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await MemberSongRepo.updateMemberSong(memberSong.id, {
        priority,
        favorite,
      });
      showToast('Đã cập nhật bài hát!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật bài hát', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${memberSong.song?.title}" khỏi playlist cá nhân?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await MemberSongRepo.removeMemberSong(memberSong.id);
      showToast(`Đã xóa bài "${memberSong.song?.title}"!`, 'info');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa bài hát', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>{memberSong.song?.title}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{memberSong.song?.artist || 'Không rõ ca sĩ'}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Priority Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            MỨC ĐỘ ƯU TIÊN
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPriority('NORMAL')}
              style={{
                padding: '10px 6px',
                borderRadius: 'var(--radius-md)',
                background: priority === 'NORMAL' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: priority === 'NORMAL' ? '1px solid #94a3b8' : '1px solid var(--border-subtle)',
                color: priority === 'NORMAL' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Biết hát
            </button>

            <button
              type="button"
              onClick={() => setPriority('WANT_TO_SING')}
              style={{
                padding: '10px 6px',
                borderRadius: 'var(--radius-md)',
                background: priority === 'WANT_TO_SING' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: priority === 'WANT_TO_SING' ? '1px solid var(--neon-cyan)' : '1px solid var(--border-subtle)',
                color: priority === 'WANT_TO_SING' ? 'var(--neon-cyan)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Music size={13} />
              Muốn hát
            </button>

            <button
              type="button"
              onClick={() => setPriority('HIGH')}
              style={{
                padding: '10px 6px',
                borderRadius: 'var(--radius-md)',
                background: priority === 'HIGH' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: priority === 'HIGH' ? '1px solid var(--neon-rose)' : '1px solid var(--border-subtle)',
                color: priority === 'HIGH' ? '#fb7185' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Flame size={13} />
              Bài tủ 🔥
            </button>
          </div>
        </div>

        {/* Favorite Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setFavorite(v => !v)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: favorite ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: favorite ? '1px solid var(--neon-amber)' : '1px solid var(--border-subtle)',
              color: favorite ? '#fbbf24' : 'var(--text-secondary)',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Star size={16} fill={favorite ? '#fbbf24' : 'none'} />
            <span>{favorite ? 'Đã yêu thích ⭐' : 'Đánh dấu yêu thích ⭐'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              flex: '1',
              padding: '12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            disabled={isSubmitting}
          >
            <Trash2 size={16} />
            <span>Xóa bài</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            style={{ flex: '2' }}
            disabled={isSubmitting}
          >
            <Check size={18} />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
