import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SongRepo, MemberSongRepo } from '../repositories';
import { Priority, Song } from '../types';
import { X, Star, Flame, Music, Plus } from 'lucide-react';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddSongModal: React.FC<AddSongModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentMember, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<Song[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setArtist('');
      setFavorite(false);
      setPriority('NORMAL');
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Live suggestions when typing
  useEffect(() => {
    if (!title.trim() || title.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const list = await SongRepo.searchSongs(title.trim());
        setSuggestions(list.slice(0, 4));
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [title]);

  if (!isOpen || !currentMember) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      showToast('Vui lòng nhập tên bài hát!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create or retrieve normalized song
      const song = await SongRepo.findOrCreateSong(title.trim(), artist.trim());
      // 2. Add to current member's personal playlist
      await MemberSongRepo.addSongToMember(currentMember.id, song.id, favorite, priority);

      showToast(`Đã thêm bài "${song.title}" vào playlist của bạn!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Không thể thêm bài hát', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSuggestion = (s: Song) => {
    setTitle(s.title);
    setArtist(s.artist);
    setSuggestions([]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <h3 style={{ fontSize: '1.15rem' }}>Thêm nhanh bài hát</h3>
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

        <form onSubmit={handleSubmit}>
          {/* Song Title */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              TÊN BÀI HÁT *
            </label>
            <input
              ref={inputRef}
              type="text"
              className="input-text"
              placeholder="VD: Nơi này có anh, Bạc phận..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Quick suggestions if already in group */}
          {suggestions.length > 0 && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '6px',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', padding: '2px 6px', fontWeight: 600 }}>
                Gợi ý bài có sẵn trong nhóm:
              </div>
              {suggestions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  className="glass-card-interactive"
                >
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{s.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.artist}</span>
                </div>
              ))}
            </div>
          )}

          {/* Artist */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              CA SĨ / NGHỆ SĨ (TÙY CHỌN)
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="VD: Sơn Tùng M-TP, Jack..."
              value={artist}
              onChange={e => setArtist(e.target.value)}
              disabled={isSubmitting}
            />
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
              <span>{favorite ? 'Đã đánh dấu Thích ⭐' : 'Thêm vào danh sách Thích ⭐'}</span>
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%' }}
          >
            <Plus size={18} />
            <span>{isSubmitting ? 'Đang lưu...' : 'Lưu bài ngay'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
