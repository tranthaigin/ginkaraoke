import { useState } from 'react';
import { Check, Flame, Music, Star, Trash2, X } from 'lucide-react';
import type { MemberSong, Priority } from '../types';
import { MemberSongRepo, SongRepo } from '../repositories';
import { useApp } from '../context/AppContext';

interface Props {
  memberSong: MemberSong | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditSongModal({ memberSong, onClose, onSuccess }: Props) {
  const { showToast, isOnline } = useApp();
  const [title, setTitle] = useState(memberSong?.song?.title ?? '');
  const [artist, setArtist] = useState(memberSong?.song?.artist ?? '');
  const [priority, setPriority] = useState<Priority>(memberSong?.priority ?? 'NORMAL');
  const [favorite, setFavorite] = useState(memberSong?.favorite ?? false);
  const [busy, setBusy] = useState(false);

  if (!memberSong) return null;

  const save = async () => {
    if (!isOnline) {
      showToast('Bạn đang offline. Thay đổi chưa được lưu.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const song = await SongRepo.findOrCreate(title, artist);
      if (song.id === memberSong.song_id) {
        await MemberSongRepo.update(memberSong.id, { priority, favorite });
      } else {
        await MemberSongRepo.add(song.id, favorite, priority);
        await MemberSongRepo.remove(memberSong.id);
      }
      showToast('Đã cập nhật bài hát! ✨', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật bài hát.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Xóa “${memberSong.song?.title}” khỏi playlist của bạn?`)) return;
    setBusy(true);
    try {
      await MemberSongRepo.remove(memberSong.id);
      showToast('Đã xóa bài hát khỏi playlist.', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể xóa bài hát.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-song-title"
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 id="edit-song-title" style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
              Chỉnh sửa bài hát
            </h3>
            <p className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>
              Thay đổi tên bài sẽ cập nhật hoặc liên kết đúng bản ghi chuẩn hóa.
            </p>
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
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label className="field-label" style={{ marginTop: 0 }}>
            Tên bài hát *
          </label>
          <input
            className="input-text"
            value={title}
            maxLength={200}
            required
            onChange={event => setTitle(event.target.value)}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="field-label" style={{ marginTop: 0 }}>
            Nghệ sĩ / Ca sĩ
          </label>
          <input
            className="input-text"
            value={artist}
            maxLength={200}
            onChange={event => setArtist(event.target.value)}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="field-label" style={{ marginTop: 0 }}>
            Mức độ ưu tiên
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
              <Music size={14} /> Muốn hát
            </button>
            <button
              type="button"
              className={`rose ${priority === 'HIGH' ? 'active' : ''}`}
              onClick={() => setPriority('HIGH')}
            >
              <Flame size={14} /> Bài tủ 🔥
            </button>
          </div>
        </div>

        {/* Favorite Button */}
        <div style={{ marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => setFavorite(value => !value)}
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
            <span>{favorite ? 'Đã yêu thích ⭐' : 'Đánh dấu yêu thích ⭐'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void remove()}
            style={{
              color: '#fb7185',
              borderColor: 'rgba(244, 63, 94, 0.35)',
              background: 'rgba(244, 63, 94, 0.08)',
            }}
          >
            <Trash2 size={16} />
            <span>Xóa</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={busy || !title.trim()}
            onClick={() => void save()}
          >
            <Check size={18} />
            <span>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
