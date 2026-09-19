import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { MemberSongRepo } from '../repositories';
import { MemberSong } from '../types';
import { matchesSearchQuery } from '../utils/normalize';
import { AddSongModal } from '../components/AddSongModal';
import { EditSongModal } from '../components/EditSongModal';
import { EmptyState } from '../components/EmptyState';
import { Search, Plus, Star, Flame, Music, X, Sparkles, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 12;

export const MySongsPage: React.FC = () => {
  const { profile, showToast } = useApp();

  const [songs, setSongs] = useState<MemberSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'HIGH' | 'WANT' | 'FAVORITE'>('ALL');
  const [sortMode, setSortMode] = useState<'UPDATED' | 'TITLE' | 'PRIORITY'>('UPDATED');
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<MemberSong | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSongs = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const list = await MemberSongRepo.getMine();
      setSongs(list);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi tải bài hát của bạn', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [profile, showToast]);

  useEffect(() => {
    void loadSongs();
  }, [loadSongs]);

  const handleToggleFavorite = async (e: React.MouseEvent, ms: MemberSong) => {
    e.stopPropagation();
    try {
      const updated = await MemberSongRepo.update(ms.id, {
        favorite: !ms.favorite,
      });
      setSongs(prev => prev.map(item => (item.id === ms.id ? updated : item)));
      showToast(updated.favorite ? 'Đã thêm vào yêu thích ⭐' : 'Đã bỏ yêu thích', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi cập nhật', 'error');
    }
  };

  // Filter & Search
  const filteredSongs = useMemo(() => {
    const priorityRank = { HIGH: 0, WANT_TO_SING: 1, NORMAL: 2 } as const;
    return songs
      .filter(item => {
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
      })
      .sort((a, b) => {
        if (sortMode === 'TITLE') return (a.song?.title ?? '').localeCompare(b.song?.title ?? '', 'vi');
        if (sortMode === 'PRIORITY') return priorityRank[a.priority] - priorityRank[b.priority];
        return (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? '');
      });
  }, [songs, filterTab, searchQuery, sortMode]);

  const countHigh = songs.filter(s => s.priority === 'HIGH').length;
  const countWant = songs.filter(s => s.priority === 'WANT_TO_SING').length;
  const countFav = songs.filter(s => s.favorite).length;
  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSongs = filteredSongs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstVisibleSong = filteredSongs.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const lastVisibleSong = Math.min(safePage * PAGE_SIZE, filteredSongs.length);
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(page => page === 1 || page === totalPages || Math.abs(page - safePage) <= 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, sortMode]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="page-container">
      {/* Strong Page Header with Responsive Metadata Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="eyebrow">
            <Sparkles size={12} /> BỘ SƯU TẬP BÀI HÁT
          </span>
          <h1 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span>Playlist của tôi</span>
            <span style={{ fontSize: '1.3rem' }}>🎵</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}>
              {songs.length} bài hát
            </span>
            <span className="badge badge-rose">
              <Flame size={11} />
              <span>{countHigh} bài tủ</span>
            </span>
            <span className="badge badge-cyan">
              <Music size={11} />
              <span>{countWant} muốn hát</span>
            </span>
            <span className="badge badge-amber">
              <Star size={11} />
              <span>{countFav} yêu thích</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.92rem', minHeight: '44px' }}
        >
          <Plus size={18} />
          <span>Thêm bài hát mới</span>
        </button>
      </div>

      {/* Unified Search & Filter Toolbar */}
      <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Top Row: Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="input-text"
              style={{ paddingLeft: '42px', paddingRight: searchQuery ? '40px' : '16px' }}
              placeholder="Tìm bài hát theo tên bài, tên nghệ sĩ, nhạc sĩ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Bottom Row: Filter Tabs & Sort Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            {/* Filter Pills */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '2px',
                scrollbarWidth: 'none',
              }}
            >
              <button
                onClick={() => setFilterTab('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: filterTab === 'ALL' ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.06)',
                  color: filterTab === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                Tất cả ({songs.length})
              </button>

              <button
                onClick={() => setFilterTab('HIGH')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: filterTab === 'HIGH' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  color: filterTab === 'HIGH' ? '#fb7185' : 'var(--text-secondary)',
                  border: filterTab === 'HIGH' ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid transparent',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Flame size={13} />
                <span>Bài tủ 🔥 ({countHigh})</span>
              </button>

              <button
                onClick={() => setFilterTab('WANT')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: filterTab === 'WANT' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  color: filterTab === 'WANT' ? '#22d3ee' : 'var(--text-secondary)',
                  border: filterTab === 'WANT' ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid transparent',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Music size={13} />
                <span>Muốn hát ({countWant})</span>
              </button>

              <button
                onClick={() => setFilterTab('FAVORITE')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: filterTab === 'FAVORITE' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  color: filterTab === 'FAVORITE' ? '#fbbf24' : 'var(--text-secondary)',
                  border: filterTab === 'FAVORITE' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Star size={13} fill="#fbbf24" />
                <span>Yêu thích ({countFav})</span>
              </button>
            </div>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sắp xếp:</span>
              <select
                className="song-sort-select"
                value={sortMode}
                onChange={e => setSortMode(e.target.value as typeof sortMode)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <option value="UPDATED">Mới cập nhật</option>
                <option value="TITLE">Tên bài hát (A–Z)</option>
                <option value="PRIORITY">Độ ưu tiên</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Denser Responsive Song Grid (Single column mobile, 2 col tablet, 3+ col desktop) */}
      {isLoading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
          <p>Đang tải playlist của bạn…</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <EmptyState
          icon={<Music size={32} />}
          title={searchQuery ? 'Không tìm thấy bài hát' : 'Playlist của bạn đang trống'}
          description={
            searchQuery
              ? `Không có bài hát nào khớp với "${searchQuery}". Thử từ khóa khác hoặc thêm bài mới.`
              : 'Hãy thêm những bài hát tủ hoặc bài bạn biết hát để GinKaraoke tìm bài chung cho cả nhóm nhé!'
          }
          actionLabel="Thêm bài ngay"
          actionIcon={<Plus size={16} />}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="adaptive-cards-grid">
          {paginatedSongs.map(item => (
            <div
              key={item.id}
              className="glass-card-interactive"
              onClick={() => setEditingSong(item)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '14px 16px',
                minHeight: '110px',
                position: 'relative',
              }}
            >
              {/* Card Header: Title & Favorite Star */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.song?.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.song?.artist || 'Chưa rõ ca sĩ'}
                  </p>
                </div>

                {/* Favorite Star Button */}
                <button
                  className={`favorite-btn ${item.favorite ? 'is-active' : ''}`}
                  onClick={e => void handleToggleFavorite(e, item)}
                  title={item.favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                  aria-label="Yêu thích"
                  style={{ width: '32px', height: '32px', flexShrink: 0 }}
                >
                  <Star size={16} fill={item.favorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Card Footer: Priority Tag & Edit hint */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.priority === 'HIGH' && (
                    <span className="badge badge-rose">
                      <Flame size={11} />
                      <span>Bài tủ 🔥</span>
                    </span>
                  )}
                  {item.priority === 'WANT_TO_SING' && (
                    <span className="badge badge-cyan">
                      <Music size={11} />
                      <span>Muốn hát</span>
                    </span>
                  )}
                  {item.priority === 'NORMAL' && (
                    <span
                      className="badge"
                      style={{ background: 'rgba(255, 255, 255, 0.07)', color: 'var(--text-secondary)' }}
                    >
                      Biết hát
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Edit3 size={12} />
                  <span>Sửa</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredSongs.length > PAGE_SIZE && (
        <nav className="songs-pagination" aria-label="Phân trang bài hát">
          <p>
            Hiển thị {firstVisibleSong}–{lastVisibleSong} trong {filteredSongs.length} bài
          </p>
          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang trước"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            >
              <ChevronLeft size={17} />
            </button>
            {visiblePages.map((page, index) => {
              const previous = visiblePages[index - 1];
              return (
                <span key={page} className="pagination-item">
                  {previous && page - previous > 1 && <span className="pagination-ellipsis">…</span>}
                  <button
                    type="button"
                    className={`pagination-button ${page === safePage ? 'is-active' : ''}`}
                    aria-label={`Trang ${page}`}
                    aria-current={page === safePage ? 'page' : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang sau"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </nav>
      )}

      {/* Add Song Modal */}
      <AddSongModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadSongs}
      />

      {/* Edit Song Modal */}
      {editingSong && (
        <EditSongModal
          memberSong={editingSong}
          onClose={() => setEditingSong(null)}
          onSuccess={loadSongs}
        />
      )}
    </div>
  );
};
