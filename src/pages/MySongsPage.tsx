import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MemberSongRepo } from '../repositories';
import { MemberSong } from '../types';
import { matchesSearchQuery } from '../utils/normalize';
import { AddSongModal } from '../components/AddSongModal';
import { EditSongModal } from '../components/EditSongModal';
import { Search, Plus, Star, Flame, Music, Edit2 } from 'lucide-react';

export const MySongsPage: React.FC = () => {
  const { currentMember, showToast } = useApp();

  const [songs, setSongs] = useState<MemberSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'HIGH' | 'WANT' | 'FAVORITE'>('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<MemberSong | null>(null);

  const loadSongs = async () => {
    if (!currentMember) return;
    setLoading(true);
    try {
      const list = await MemberSongRepo.getMemberSongs(currentMember.id);
      setSongs(list);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải bài hát của bạn', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();
  }, [currentMember?.id]);

  const handleToggleFavorite = async (e: React.MouseEvent, ms: MemberSong) => {
    e.stopPropagation();
    try {
      const updated = await MemberSongRepo.updateMemberSong(ms.id, {
        favorite: !ms.favorite,
      });
      setSongs(prev => prev.map(item => (item.id === ms.id ? updated : item)));
      showToast(updated.favorite ? 'Đã thêm vào yêu thích ⭐' : 'Đã bỏ yêu thích', 'info');
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật', 'error');
    }
  };

  // Filter & Search
  const filteredSongs = useMemo(() => {
    return songs.filter(item => {
      if (!item.song) return false;

      // Tab filter
      if (filterTab === 'HIGH' && item.priority !== 'HIGH') return false;
      if (filterTab === 'WANT' && item.priority !== 'WANT_TO_SING') return false;
      if (filterTab === 'FAVORITE' && !item.favorite) return false;

      // Search matching (Title & Artist)
      if (searchQuery.trim()) {
        const titleMatch = matchesSearchQuery(item.song.title, searchQuery);
        const artistMatch = matchesSearchQuery(item.song.artist, searchQuery);
        return titleMatch || artistMatch;
      }

      return true;
    });
  }, [songs, filterTab, searchQuery]);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Playlist của {currentMember?.display_name}</span>
            <span style={{ fontSize: '1.2rem' }}>{currentMember?.avatar || '🎵'}</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tổng cộng: {songs.length} bài hát
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.84rem' }}
        >
          <Plus size={16} />
          <span>Thêm bài</span>
        </button>
      </div>

      {/* Instant Search Bar */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search
          size={18}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          className="input-text"
          style={{ paddingLeft: '42px' }}
          placeholder="Tìm bài hát, ca sĩ..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '14px',
        scrollbarWidth: 'none',
      }}>
        <button
          onClick={() => setFilterTab('ALL')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: filterTab === 'ALL' ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.06)',
            color: filterTab === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Tất cả ({songs.length})
        </button>

        <button
          onClick={() => setFilterTab('HIGH')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: filterTab === 'HIGH' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.06)',
            color: filterTab === 'HIGH' ? '#fb7185' : 'var(--text-secondary)',
            border: filterTab === 'HIGH' ? '1px solid rgba(244, 63, 94, 0.6)' : 'none',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <Flame size={13} />
          <span>Bài tủ 🔥 ({songs.filter(s => s.priority === 'HIGH').length})</span>
        </button>

        <button
          onClick={() => setFilterTab('WANT')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: filterTab === 'WANT' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.06)',
            color: filterTab === 'WANT' ? '#22d3ee' : 'var(--text-secondary)',
            border: filterTab === 'WANT' ? '1px solid rgba(6, 182, 212, 0.6)' : 'none',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <Music size={13} />
          <span>Muốn hát 🎵 ({songs.filter(s => s.priority === 'WANT_TO_SING').length})</span>
        </button>

        <button
          onClick={() => setFilterTab('FAVORITE')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: filterTab === 'FAVORITE' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.06)',
            color: filterTab === 'FAVORITE' ? '#fbbf24' : 'var(--text-secondary)',
            border: filterTab === 'FAVORITE' ? '1px solid rgba(245, 158, 11, 0.6)' : 'none',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <Star size={13} fill="#fbbf24" />
          <span>Yêu thích ⭐ ({songs.filter(s => s.favorite).length})</span>
        </button>
      </div>

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
          <Music size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Không tìm thấy bài hát nào</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn nút "Thêm bài" để lưu các bài bạn biết hát nhé!'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
            style={{ marginTop: '16px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Thêm bài ngay</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredSongs.map(item => (
            <div
              key={item.id}
              className="glass-card-interactive"
              onClick={() => setEditingSong(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
              }}
            >
              {/* Song Information */}
              <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{item.song?.title}</span>
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.song?.artist || 'Không rõ ca sĩ'}
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  {item.priority === 'HIGH' && (
                    <span className="badge badge-rose">
                      <Flame size={11} />
                      Bài tủ 🔥
                    </span>
                  )}
                  {item.priority === 'WANT_TO_SING' && (
                    <span className="badge badge-cyan">
                      <Music size={11} />
                      Muốn hát
                    </span>
                  )}
                  {item.priority === 'NORMAL' && (
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                      Biết hát
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* 1-Click Favorite Toggle */}
                <button
                  type="button"
                  onClick={e => handleToggleFavorite(e, item)}
                  style={{
                    background: item.favorite ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: item.favorite ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.favorite ? '#fbbf24' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={item.favorite ? 'Bỏ thích' : 'Thích'}
                >
                  <Star size={16} fill={item.favorite ? '#fbbf24' : 'none'} />
                </button>

                {/* Edit Icon */}
                <div style={{ color: 'var(--text-muted)' }}>
                  <Edit2 size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddSongModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadSongs}
      />

      {/* Edit Modal */}
      <EditSongModal
        memberSong={editingSong}
        onClose={() => setEditingSong(null)}
        onSuccess={loadSongs}
      />
    </div>
  );
};
