import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SongRepo, MemberSongRepo } from '../repositories';
import { Priority, Song } from '../types';
import { X, Star, Flame, Music, Plus, Sparkles } from 'lucide-react';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddSongModal: React.FC<AddSongModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast, isOnline } = useApp();

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
        const list = await SongRepo.search(title.trim());
        setSuggestions(list.slice(0, 4));
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [title]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      showToast('Vui lòng nhập tên bài hát!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isOnline) throw new Error('Bạn đang offline. Bài hát chưa được lưu.');
      const song = await SongRepo.findOrCreate(title.trim(), artist.trim());
      await MemberSongRepo.add(song.id, favorite, priority);

      showToast(`Đã thêm bài "${song.title}" vào playlist của bạn! 🎶`, 'success');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể thêm bài hát', 'error');
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
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-song-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>✨</span>
            <h3 id="add-song-title" style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
              Thêm bài vào playlist
            </h3>
          </div>
          <button
            aria-label="Đóng"
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
              transition: 'all 0.2s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Song Title Field */}
          <div style={{ marginBottom: '14px' }}>
            <label className="field-label" style={{ marginTop: 0 }}>
              TÊN BÀI HÁT *
            </label>
            <input
              ref={inputRef}
              type="text"
              className="input-text"
              placeholder="VD: Nơi này có anh, Bạc phận, Em của ngày hôm qua..."
              value={title}
              maxLength={200}
              onChange={e => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Live suggestions */}
          {suggestions.length > 0 && (
            <div
              style={{
                background: 'rgba(11, 17, 32, 0.95)',
                border: '1px solid rgba(0, 242, 254, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '8px',
                marginBottom: '14px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: 'var(--neon-cyan)', padding: '2px 6px 6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={12} />
                <span>Gợi ý bài đã có trong nhóm:</span>
              </div>
              {suggestions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSuggestion(s)}
                  className="glass-card-interactive"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.artist}</span>
                </div>
              ))}
            </div>
          )}

          {/* Artist Field */}
          <div style={{ marginBottom: '16px' }}>
            <label className="field-label" style={{ marginTop: 0 }}>
              CA SĨ / NGHỆ SĨ (TÙY CHỌN)
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="VD: Sơn Tùng M-TP, Vũ..."
              value={artist}
              maxLength={200}
              onChange={e => setArtist(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Priority Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label className="field-label" style={{ marginTop: 0 }}>
              MỨC ĐỘ ƯU TIÊN HÁT
            </label>
            <div className="priority-grid">
              <button
                type="button"
                className={priority === 'NORMAL' ? 'active' : ''}
                onClick={() => setPriority('NORMAL')}
              >
                Biết hát
              </button>

              <button
                type="button"
                className={`cyan ${priority === 'WANT_TO_SING' ? 'active' : ''}`}
                onClick={() => setPriority('WANT_TO_SING')}
              >
                <Music size={14} />
                <span>Muốn hát</span>
              </button>

              <button
                type="button"
                className={`rose ${priority === 'HIGH' ? 'active' : ''}`}
                onClick={() => setPriority('HIGH')}
              >
                <Flame size={14} />
                <span>Bài tủ 🔥</span>
              </button>
            </div>
          </div>

          {/* Favorite Toggle Button */}
          <div style={{ marginBottom: '22px' }}>
            <button
              type="button"
              onClick={() => setFavorite(v => !v)}
              style={{
                width: '100%',
                padding: '11px 16px',
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
                transition: 'all 0.2s ease',
              }}
            >
              <Star size={17} fill={favorite ? '#fbbf24' : 'none'} />
              <span>{favorite ? 'Đã thêm vào danh sách Yêu thích ⭐' : 'Đánh dấu bài Yêu thích ⭐'}</span>
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || !title.trim()}
            style={{ width: '100%' }}
          >
            {isSubmitting ? (
              <span>Đang lưu bài…</span>
            ) : (
              <>
                <Plus size={18} />
                <span>Lưu bài vào Playlist</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
