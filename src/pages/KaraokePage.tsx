import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MemberSongRepo, SessionRepo, SongRepo } from '../repositories';
import { generateKaraokePlaylist } from '../services/recommendation/engine';
import { KaraokeSession, SessionSong, SongRecommendation } from '../types';
import {
  Users,
  Mic,
  CheckCircle2,
  Undo2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  X,
  Sparkles,
  Search,
  Check
} from 'lucide-react';
import { matchesSearchQuery } from '../utils/normalize';

export const KaraokePage: React.FC = () => {
  const { currentGroup, members, showToast } = useApp();

  // Mode: 'SELECTION' (Who goes today?) or 'LIVE_SESSION' (Active karaoke playlist)
  const [mode, setMode] = useState<'SELECTION' | 'LIVE_SESSION'>('SELECTION');

  // Selected participants for the session
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Active Session state
  const [activeSession, setActiveSession] = useState<KaraokeSession | null>(null);
  const [sessionSongs, setSessionSongs] = useState<SessionSong[]>([]);
  const [sessionMembers, setSessionMembers] = useState<any[]>([]);

  // Generated recommendations before saving session
  const [recommendations, setRecommendations] = useState<SongRecommendation[]>([]);

  // UI helpers
  const [showSungSection, setShowSungSection] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if there is an active session on mount
  const checkActiveSession = async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      const active = await SessionRepo.getActiveSession(currentGroup.id);
      if (active) {
        const details = await SessionRepo.getSessionDetails(active.id);
        if (details) {
          setActiveSession(details.session);
          setSessionSongs(details.songs);
          setSessionMembers(details.members);
          setSelectedMemberIds(details.members.map(m => m.id));
          setMode('LIVE_SESSION');
        }
      } else {
        // By default, select all members initially for convenience
        setSelectedMemberIds(members.map(m => m.id));
      }
    } catch (err: any) {
      console.error('Lỗi kiểm tra session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkActiveSession();
  }, [currentGroup?.id, members.length]);

  // Toggle member selection
  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map(m => m.id));
    }
  };

  // Generate playlist based on chosen attendees
  const handleGeneratePlaylist = async () => {
    if (selectedMemberIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 thành viên đi hôm nay!', 'warning');
      return;
    }
    if (!currentGroup) return;

    setIsGenerating(true);
    try {
      // 1. Fetch group member songs & all songs
      const allMemberSongs = await MemberSongRepo.getAllMemberSongsForGroup(currentGroup.id);
      const allSongs = await SongRepo.getAllSongs();

      // 2. Fetch recently sung song IDs from last 2 sessions
      const recentSungIds = await SessionRepo.getRecentlySungSongIds(currentGroup.id, 2);

      // 3. Run Recommendation & Fairness Engine
      const recs = generateKaraokePlaylist({
        selectedMemberIds,
        members,
        memberSongs: allMemberSongs,
        allSongs,
        recentlySungSongIds: recentSungIds,
      });

      if (recs.length === 0) {
        showToast('Những người được chọn chưa có bài hát nào trong playlist cá nhân!', 'warning');
        setIsGenerating(false);
        return;
      }

      setRecommendations(recs);

      // 4. Create and persist Karaoke Session
      const sessionTitle = `Karaoke ${new Date().toLocaleDateString('vi-VN')}`;
      const initialSongItems = recs.map((r, index) => ({
        songId: r.song.id,
        score: r.score,
        priorityOrder: index,
      }));

      const newSession = await SessionRepo.createSession(
        currentGroup.id,
        sessionTitle,
        selectedMemberIds,
        initialSongItems
      );

      const details = await SessionRepo.getSessionDetails(newSession.id);
      if (details) {
        setActiveSession(details.session);
        setSessionSongs(details.songs);
        setSessionMembers(details.members);
      }

      setMode('LIVE_SESSION');
      showToast(`Đã tạo playlist buổi hát với ${recs.length} bài! 🎤`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tạo playlist', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Mark song as sung or undo
  const handleToggleSung = async (sessionSongId: string, currentSung: boolean) => {
    try {
      await SessionRepo.toggleSongSung(sessionSongId, !currentSung);
      setSessionSongs(prev =>
        prev.map(s => (s.id === sessionSongId ? { ...s, sung: !currentSung, sung_at: !currentSung ? new Date().toISOString() : null } : s))
      );
      if (!currentSung) {
        showToast('Đã hát xong bài này! 🎵 Tuyệt vời!', 'success');
      } else {
        showToast('Đã hoàn tác bài hát vào danh sách chờ.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật', 'error');
    }
  };

  // Bump song priority to top
  const handleBumpToTop = async (sessionSong: SessionSong) => {
    const minOrder = Math.min(...sessionSongs.map(s => s.priority_order), 0);
    const newOrder = minOrder - 1;
    try {
      await SessionRepo.updateSessionSongOrder(sessionSong.id, newOrder);
      setSessionSongs(prev =>
        prev
          .map(s => (s.id === sessionSong.id ? { ...s, priority_order: newOrder } : s))
          .sort((a, b) => a.priority_order - b.priority_order)
      );
      showToast(`Đã đưa "${sessionSong.song?.title}" lên đầu playlist! 🔥`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi sắp xếp', 'error');
    }
  };

  // Remove song from session
  const handleRemoveFromSession = (sessionSongId: string) => {
    setSessionSongs(prev => prev.filter(s => s.id !== sessionSongId));
    showToast('Đã bỏ bài khỏi playlist hôm nay.', 'info');
  };

  // Finish session
  const handleCompleteSession = async () => {
    if (!activeSession) return;
    const sungCount = sessionSongs.filter(s => s.sung).length;
    if (!window.confirm(`Bạn có muốn kết thúc buổi hát này không? (Đã hát ${sungCount} bài)`)) {
      return;
    }
    try {
      await SessionRepo.completeSession(activeSession.id);
      showToast(`Buổi hát đã kết thúc thành công! Đã lưu lịch sử (${sungCount} bài).`, 'success');
      setActiveSession(null);
      setSessionSongs([]);
      setMode('SELECTION');
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết thúc buổi hát', 'error');
    }
  };

  // Filter songs in current session
  const pendingSongs = sessionSongs
    .filter(s => !s.sung)
    .filter(s => !sessionSearch || matchesSearchQuery(s.song?.title || '', sessionSearch) || matchesSearchQuery(s.song?.artist || '', sessionSearch));

  const sungSongs = sessionSongs
    .filter(s => s.sung)
    .filter(s => !sessionSearch || matchesSearchQuery(s.song?.title || '', sessionSearch) || matchesSearchQuery(s.song?.artist || '', sessionSearch));

  // STEP 1: ATTENDEE SELECTION VIEW
  if (mode === 'SELECTION') {
    return (
      <div className="page-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--grad-primary)',
            fontSize: '1.8rem',
            marginBottom: '10px',
            boxShadow: 'var(--shadow-glow)'
          }}>
            🎤
          </div>
          <h1 style={{ fontSize: '1.55rem' }}>HÔM NAY AI ĐI? 🎤</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Chọn những người tham gia buổi hát để hệ thống tìm bài trùng và tối ưu thứ tự
          </p>
        </div>

        {/* Member Checklist Card */}
        <div className="glass-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              CHỌN THÀNH VIÊN ({selectedMemberIds.length}/{members.length})
            </span>
            <button
              onClick={handleSelectAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--neon-cyan)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {selectedMemberIds.length === members.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(member => {
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <div
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className="glass-card-interactive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: isSelected ? 'rgba(168, 85, 247, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isSelected ? 'var(--neon-purple)' : 'var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{member.avatar || '🎤'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                        {member.display_name}
                      </div>
                    </div>
                  </div>

                  {/* Checkbox Indicator */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: isSelected ? 'none' : '2px solid var(--text-muted)',
                      background: isSelected ? 'var(--grad-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && <Check size={16} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <button
          className="btn-primary"
          onClick={handleGeneratePlaylist}
          disabled={selectedMemberIds.length === 0 || isGenerating}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '1.05rem',
            opacity: selectedMemberIds.length === 0 ? 0.5 : 1,
            cursor: selectedMemberIds.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Mic size={20} />
          <span>{isGenerating ? 'Đang phân tích & tạo playlist...' : 'TẠO PLAYLIST BUỔI HÁT 🎤'}</span>
        </button>

        {/* Notice */}
        <p style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '14px' }}>
          * Chỉ những bài trong danh sách của các bạn được chọn mới được đưa vào thuật toán.
        </p>
      </div>
    );
  }

  // STEP 2: ACTIVE LIVE SESSION VIEW
  return (
    <div className="page-container">
      {/* Session Top Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                <Mic size={11} />
                ĐANG HÁT
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeSession ? activeSession.title : 'Playlist hôm nay'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', marginTop: '4px' }}>
              🎤 PLAYLIST HÔM NAY
            </h1>
          </div>

          <button
            onClick={handleCompleteSession}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(244, 63, 94, 0.18)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fb7185',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Kết thúc
          </button>
        </div>

        {/* Attendees Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đi hát ({sessionMembers.length}):</span>
          {sessionMembers.map(m => (
            <span
              key={m.id}
              className="badge"
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#f8fafc', fontSize: '0.76rem' }}
            >
              <span>{m.avatar}</span>
              <span>{m.display_name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* In-Session Search Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search
          size={16}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          className="input-text"
          style={{ paddingLeft: '38px', paddingRight: '12px', height: '40px', fontSize: '0.88rem' }}
          placeholder="Lọc bài trong playlist hôm nay..."
          value={sessionSearch}
          onChange={e => setSessionSearch(e.target.value)}
        />
      </div>

      {/* PENDING SONGS SECTION */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            CHỜ HÁT ({pendingSongs.length} bài)
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Đã sắp xếp theo độ trùng & sở thích
          </span>
        </div>

        {pendingSongs.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            <Sparkles size={28} style={{ margin: '0 auto 8px', color: 'var(--neon-cyan)' }} />
            <p style={{ fontWeight: 600 }}>Đã hát hết danh sách chờ!</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Tất cả các bài đã được đánh dấu hoàn thành 🎉</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingSongs.map((ss, idx) => {
              // Lookup recommendation metadata if available
              const rec = recommendations.find(r => r.song.id === ss.song_id);
              const matchCount = rec ? rec.matchCount : 1;
              const total = rec ? rec.totalParticipants : sessionMembers.length;
              const matchedMemberNames = rec ? rec.members.map(m => m.display_name).join(' • ') : '';

              return (
                <div
                  key={ss.id}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px',
                    borderLeft: idx === 0 ? '4px solid var(--neon-cyan)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--neon-purple)' }}>
                          #{idx + 1}
                        </span>
                        <h4 style={{
                          fontSize: '1rem',
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {ss.song?.title}
                        </h4>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {ss.song?.artist || 'Không rõ ca sĩ'}
                      </div>

                      {/* Overlap & Member information */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span className={matchCount === total ? 'badge badge-cyan' : 'badge badge-purple'}>
                          <Users size={11} />
                          {matchCount}/{total} người
                        </span>

                        {matchedMemberNames && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {matchedMemberNames}
                          </span>
                        )}

                        {rec?.hasFavorite && (
                          <span className="badge badge-amber">⭐ Yêu thích</span>
                        )}
                        {rec?.topPriority === 'HIGH' && (
                          <span className="badge badge-rose">🔥 Cháy</span>
                        )}
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveFromSession(ss.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Bỏ bài khỏi playlist hôm nay"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <button
                      onClick={() => handleBumpToTop(ss)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 10px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Đưa bài lên đầu danh sách"
                    >
                      <ArrowUp size={13} />
                      <span>Ưu tiên lên đầu</span>
                    </button>

                    <button
                      onClick={() => handleToggleSung(ss.id, false)}
                      className="btn-primary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        minHeight: '36px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Đã hát 🎵</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SUNG SONGS COLLAPSIBLE SECTION */}
      {sungSongs.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => setShowSungSection(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              ĐÃ HÁT ({sungSongs.length} bài) ✅
            </span>
            {showSungSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showSungSection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sungSongs.map(ss => (
                <div
                  key={ss.id}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    opacity: 0.75,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textDecoration: 'line-through',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ss.song?.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {ss.song?.artist || 'Không rõ ca sĩ'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleSung(ss.id, true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 10px',
                      color: 'var(--neon-cyan)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Undo2 size={13} />
                    <span>Undo</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
