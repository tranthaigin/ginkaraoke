import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Mic,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MemberSongRepo, SessionRepo, SongRepo } from '../repositories';
import type { Availability } from '../services/recommendation/engine';
import { calculateSessionStats, generateKaraokePlaylist, inspectAvailability } from '../services/recommendation/engine';
import type { KaraokeSession, Profile, QueueHistoryItem, SessionSong } from '../types';
import { supabase } from '../services/supabase';
import { SingerPair } from '../components/SingerPair';
import { MemberAvatar } from '../components/MemberAvatar';
import { EqualizerIcon } from '../components/EqualizerIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';

interface RoomData {
  session: KaraokeSession;
  members: Profile[];
  songs: SessionSong[];
}

const defaultName = () => `Karaoke ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;

export function KaraokePage() {
  const { currentGroup, members, isOnline, showToast } = useApp();
  const profiles = useMemo(
    () => members.map(item => item.profile).filter((item): item is Profile => Boolean(item)),
    [members]
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [sessionName, setSessionName] = useState(defaultName);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPlayed, setShowPlayed] = useState(false);
  const [confirmRecycle, setConfirmRecycle] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [inspectionSong, setInspectionSong] = useState<SessionSong | null>(null);
  const [loading, setLoading] = useState(true);

  const historyOf = (songs: SessionSong[]): QueueHistoryItem[] =>
    songs
      .slice()
      .sort((a, b) => a.queue_position - b.queue_position)
      .map(song => ({
        songId: song.song_id,
        singerIds: [song.singer_1_id, song.singer_2_id],
        state: song.state,
      }));

  const calculateAvailability = useCallback(
    async (data: RoomData) => {
      if (!currentGroup) return;
      const [memberSongs, songs] = await Promise.all([
        MemberSongRepo.getForGroup(currentGroup.id),
        SongRepo.getAll(),
      ]);
      setAvailability(
        inspectAvailability({
          selectedMemberIds: data.members.map(member => member.id),
          members: data.members,
          memberSongs,
          allSongs: songs,
          sessionHistory: historyOf(data.songs),
        })
      );
    },
    [currentGroup]
  );

  const loadRoom = useCallback(
    async (session: KaraokeSession | string) => {
      const details = await SessionRepo.details(typeof session === 'string' ? session : session.id);
      if (!details) return;
      const data = { session: details.session, members: details.members, songs: details.songs };
      setRoom(data);
      await calculateAvailability(data);
    },
    [calculateAvailability]
  );

  const loadActive = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      const active = await SessionRepo.getActive(currentGroup.id);
      if (active) {
        await loadRoom(active);
      } else {
        setRoom(null);
        setSelected(profiles.map(profile => profile.id));
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải phòng hát.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentGroup, loadRoom, profiles, showToast]);

  useEffect(() => {
    void loadActive();
  }, [loadActive]);

  // Realtime Supabase Subscription
  useEffect(() => {
    const sessionId = room?.session.id;
    if (!supabase || !sessionId) return;
    const client = supabase;
    const channel = client
      .channel(`room:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_songs', filter: `session_id=eq.${sessionId}` },
        () => void loadRoom(sessionId)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'karaoke_sessions', filter: `id=eq.${sessionId}` },
        () => void loadRoom(sessionId)
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          showToast('Realtime bị gián đoạn. Dữ liệu sẽ đồng bộ khi thao tác.', 'warning');
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadRoom, room?.session.id, showToast]);

  const computeRecommendations = async (participantIds: string[], existing: SessionSong[], recycleMode: boolean) => {
    if (!currentGroup) return [];
    const [memberSongs, songs, recent] = await Promise.all([
      MemberSongRepo.getForGroup(currentGroup.id),
      SongRepo.getAll(),
      SessionRepo.recentPlayed(currentGroup.id),
    ]);
    return generateKaraokePlaylist({
      selectedMemberIds: participantIds,
      members: profiles,
      memberSongs,
      allSongs: songs,
      sessionHistory: historyOf(existing),
      recentlySungSongIds: recent,
      recycleMode,
    });
  };

  const createRoom = async () => {
    if (!currentGroup || selected.length < 2) {
      showToast('Chọn ít nhất 2 bạn để tạo hàng đợi song ca.', 'warning');
      return;
    }
    if (!isOnline) {
      showToast('Bạn đang offline. Chưa thể tạo buổi hát.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const recommendations = await computeRecommendations(selected, [], false);
      if (!recommendations.length) {
        throw new Error('Chưa có bài nào được ít nhất 2 người tham dự cùng biết hát. Hãy thêm bài vào playlist!');
      }
      const session = await SessionRepo.create(currentGroup.id, sessionName.trim() || defaultName(), selected);
      await SessionRepo.addBatch(session.id, recommendations, false);
      await loadRoom(session);
      showToast(`Đã tạo ${recommendations.length} bài song ca cho cả nhóm! 🎤`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tạo buổi hát.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const generateNext = async (recycleMode = false) => {
    if (!room || !isOnline) {
      showToast('Cần kết nối mạng để tạo lượt mới.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const result = await computeRecommendations(
        room.members.map(member => member.id),
        room.songs,
        recycleMode
      );
      if (!result.length) {
        if (availability?.exhausted && !recycleMode) {
          setConfirmRecycle(true);
        } else {
          showToast('Không còn bài song ca phù hợp để tạo lượt mới.', 'warning');
        }
        return;
      }
      await SessionRepo.addBatch(room.session.id, result, recycleMode);
      await loadRoom(room.session);
      setConfirmRecycle(false);
      showToast(`${recycleMode ? 'Đã dùng lại' : 'Đã thêm'} ${result.length} bài vào hàng đợi!`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tạo lượt đề xuất.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const mutate = async (action: () => Promise<void>, success: string) => {
    if (!room || !isOnline) {
      showToast('Bạn đang offline. Thay đổi chưa được lưu.', 'warning');
      return;
    }
    try {
      await action();
      await loadRoom(room.session);
      showToast(success, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật hàng đợi.', 'error');
    }
  };

  const complete = async () => {
    if (!room) return;
    await mutate(() => SessionRepo.complete(room.session.id), 'Đã lưu buổi hát vào lịch sử!');
    setConfirmComplete(false);
    setRoom(null);
    setAvailability(null);
    setSessionName(defaultName());
  };

  // Loading State
  if (loading) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <EqualizerIcon size="lg" animated={true} />
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Đang kết nối phòng hát…</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW A: Session Creation Setup (When no active session)
  // =========================================================
  if (!room) {
    return (
      <div className="page-container">
        <div className="adaptive-split-layout">
          {/* Main Left Area: Session Name & Attendee Selection */}
          <div className="adaptive-main-col">
            <section style={{ marginBottom: '8px' }}>
              <span className="eyebrow">
                <Sparkles size={12} /> BẮT ĐẦU BUỔI HÁT
              </span>
              <h1 style={{ fontSize: '1.85rem', marginTop: '4px' }}>Hôm nay ai đi hát?</h1>
              <p className="muted" style={{ fontSize: '0.88rem', marginTop: '4px' }}>
                Chọn thành viên tham gia để thuật toán tìm bài trùng và phân cặp song ca công bằng.
              </p>
            </section>

            {/* Session Name Field */}
            <div className="glass-card" style={{ padding: '16px 20px' }}>
              <label className="field-label" htmlFor="session-name" style={{ marginTop: 0 }}>
                TÊN BUỔI HÁT
              </label>
              <input
                id="session-name"
                className="input-text"
                value={sessionName}
                maxLength={120}
                onChange={event => setSessionName(event.target.value)}
                placeholder="VD: Karaoke cuối tuần, Quẩy sinh nhật..."
              />
            </div>

            {/* Member Selector Cards */}
            <section className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--neon-purple)" />
                  <h2 style={{ fontSize: '1.1rem' }}>
                    Người tham gia ({selected.length}/{profiles.length})
                  </h2>
                </div>
                <button
                  className="text-button"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() =>
                    setSelected(selected.length === profiles.length ? [] : profiles.map(profile => profile.id))
                  }
                >
                  {selected.length === profiles.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </button>
              </div>

              <div className="adaptive-grid-2col">
                {profiles.map(profile => {
                  const isSelected = selected.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() =>
                        setSelected(ids =>
                          ids.includes(profile.id) ? ids.filter(id => id !== profile.id) : [...ids, profile.id]
                        )
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '1.5px solid var(--neon-cyan)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        textAlign: 'left',
                        boxShadow: isSelected ? '0 0 16px rgba(0, 242, 254, 0.15)' : 'none',
                      }}
                    >
                      <MemberAvatar profile={profile} size="md" selected={isSelected} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            fontFamily: 'var(--font-display)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {profile.display_name}
                        </div>
                      </div>

                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.08)',
                          border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={16} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Mobile-only CTA */}
            <div className="mobile-only-block" style={{ marginTop: '8px' }}>
              <button
                className="btn-primary"
                disabled={busy || selected.length < 2}
                onClick={() => void createRoom()}
                style={{ width: '100%', minHeight: '52px', fontSize: '1.05rem' }}
              >
                {busy ? (
                  <>
                    <EqualizerIcon size="sm" animated={true} />
                    <span>Đang phân tích và chia cặp song ca…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Bắt đầu buổi hát ({selected.length} người)</span>
                  </>
                )}
              </button>

              {selected.length < 2 && (
                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--neon-amber)', marginTop: '8px' }}>
                  * Vui lòng chọn tối thiểu 2 người để ghép cặp song ca.
                </p>
              )}
            </div>
          </div>

          {/* Right Summary Panel (Desktop >=1024px) */}
          <aside className="adaptive-sidebar-col desktop-only-block">
            <div className="glass-card" style={{ padding: '24px' }}>
              <span className="eyebrow" style={{ marginBottom: '8px' }}>
                <Sparkles size={12} /> TỔNG KẾT BUỔI HÁT
              </span>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
                {sessionName || 'Buổi hát mới'}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Nhóm: <strong>{currentGroup?.name}</strong>
              </p>

              <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '16px 0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Thành viên tham gia
                  </span>
                  <span className="badge badge-cyan">{selected.length} người</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {selected.map(id => {
                    const p = profiles.find(item => item.id === id);
                    return p ? (
                      <div
                        key={id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <MemberAvatar profile={p} size="xs" />
                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{p.display_name}</span>
                      </div>
                    ) : null;
                  })}
                </div>

                {selected.length < 2 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--neon-amber)' }}>
                    ⚠️ Cần chọn tối thiểu 2 người để ghép cặp song ca.
                  </p>
                ) : (
                  <p style={{ fontSize: '0.78rem', color: 'var(--emerald-400)' }}>
                    ✓ Đủ điều kiện tạo phòng và tạo playlist thông minh.
                  </p>
                )}
              </div>

              <button
                className="btn-primary"
                disabled={busy || selected.length < 2}
                onClick={() => void createRoom()}
                style={{ width: '100%', minHeight: '52px', fontSize: '1.05rem' }}
              >
                {busy ? (
                  <>
                    <EqualizerIcon size="sm" animated={true} />
                    <span>Đang phân tích và chia cặp…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Bắt đầu buổi hát ngay</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW B: Active Live Room (Centerpiece of the App)
  // =========================================================
  const nameById = new Map(room.members.map(member => [member.id, member.display_name]));
  const profileById = new Map(room.members.map(member => [member.id, member]));

  const queued = room.songs
    .filter(song => song.state === 'QUEUED')
    .sort((a, b) => a.queue_position - b.queue_position);

  const played = room.songs
    .filter(song => song.state === 'PLAYED')
    .sort((a, b) => (b.played_at ?? '').localeCompare(a.played_at ?? ''));

  const stats = calculateSessionStats(
    room.members.map(member => member.id),
    historyOf(room.songs)
  );

  const minPosition = Math.min(0, ...room.songs.map(song => song.queue_position)) - 1;

  // The very top song in queue (#1) gets the VIP Spotlight!
  const spotlightSong = queued[0] ?? null;
  const subsequentQueue = queued.slice(1);

  return (
    <div className="page-container">
      <div className="adaptive-split-layout">
        {/* Main Column: Header, Spotlight, Queue, Played */}
        <div className="adaptive-main-col">
          {/* Live Room Header */}
          <section className="room-header">
        <div>
          <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--neon-emerald)',
                boxShadow: '0 0 8px var(--neon-emerald)',
                display: 'inline-block',
              }}
            />
            <span>ĐANG HÁT TRỰC TIẾP</span>
          </span>

          <h1 style={{ fontSize: '1.45rem', marginTop: '2px' }}>{room.session.name}</h1>

          {/* Participant Avatars & Names */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', marginLeft: '4px' }}>
              {room.members.slice(0, 5).map((member, i) => (
                <div key={member.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
                  <MemberAvatar profile={member} size="xs" />
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {room.members.length} người: {room.members.map(m => m.display_name).join(', ')}
            </span>
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={() => setConfirmComplete(true)}
          style={{
            color: '#fb7185',
            borderColor: 'rgba(244, 63, 94, 0.35)',
            background: 'rgba(244, 63, 94, 0.08)',
            padding: '8px 14px',
            minHeight: '38px',
            fontSize: '0.82rem',
            whiteSpace: 'nowrap',
          }}
        >
          Kết thúc
        </button>
      </section>

          {/* Mobile-only Metrics Bar and Turn Strip */}
          <div className="mobile-only-block">
            {/* Real-time Session Metrics Bar */}
            <div className="room-stats-bar">
              <div>
                <strong>{queued.length}</strong>
                <span>Đang chờ</span>
              </div>
              <div>
                <strong>{played.length}</strong>
                <span>Đã hát</span>
              </div>
              <div>
                <strong>{availability?.unusedSongs ?? '—'}</strong>
                <span>Bài mới</span>
              </div>
              <div>
                <strong>{Object.keys(stats.pairCounts).length}</strong>
                <span>Cặp đã hát</span>
              </div>
            </div>

            {/* Fairness Turn Balance Strip */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="eyebrow" style={{ fontSize: '0.68rem' }}>
                  CÂN BẰNG LƯỢT HÁT ({room.members.length} BẠN)
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {Object.keys(stats.pairCounts).length} cặp khác nhau
                </span>
              </div>

              <div className="turn-strip">
                {room.members.map(member => (
                  <div key={member.id} className="turn-pill">
                    <MemberAvatar profile={member} size="xs" />
                    <span>{member.display_name}</span>
                    <strong>{stats.turnsByMember[member.id] ?? 0} lượt</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

      {/* =========================================================
          SPOTLIGHT CARD FOR SONG #1 (NOW SINGING / NEXT UP)
          ========================================================= */}
      {spotlightSong ? (
        <section className="spotlight-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="spotlight-badge">
              <EqualizerIcon size="sm" animated={true} />
              <span>BÀI TIẾP THEO · VỊ TRÍ #01</span>
            </div>

            {spotlightSong.recycle_mode && (
              <span className="badge badge-amber" style={{ marginBottom: '12px' }}>
                <RefreshCw size={11} /> Dùng lại bài trước
              </span>
            )}
          </div>

          <h2 className="spotlight-title">{spotlightSong.song?.title}</h2>
          <p className="spotlight-artist">{spotlightSong.song?.artist || 'Chưa rõ nghệ sĩ'}</p>

          {/* Duet Singers Showcase */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--cyan-400)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '8px' }}>
              CẶP SONG CA ĐƯỢC PHÂN CÔNG:
            </div>

            <SingerPair
              singer1={profileById.get(spotlightSong.singer_1_id)}
              singer2={profileById.get(spotlightSong.singer_2_id)}
              singer1Name={nameById.get(spotlightSong.singer_1_id)}
              singer2Name={nameById.get(spotlightSong.singer_2_id)}
              isSpotlight={true}
            />

            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.4 }}>
              Biết bởi {spotlightSong.eligible_singer_ids.length}/{room.members.length} thành viên: {' '}
              {spotlightSong.eligible_singer_ids.map(id => nameById.get(id)).filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Primary Spotlight Action: Done / Played */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => void mutate(() => SessionRepo.setSongState(spotlightSong.id, true), 'Đã hát xong! Tiếp tục quẩy 🎤')}
              style={{
                flex: 1,
                minHeight: '48px',
                fontSize: '1rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
              }}
            >
              <CheckCircle2 size={20} />
              <span>Đã hát xong bài này</span>
            </button>

            <button
              className="btn-icon"
              onClick={() => setInspectionSong(spotlightSong)}
              title="Xem thông tin đề xuất"
              aria-label="Thông tin đề xuất"
            >
              <Info size={18} />
            </button>

            <button
              className="btn-icon"
              onClick={() => void mutate(() => SessionRepo.removeSong(spotlightSong.id), 'Đã bỏ bài khỏi hàng đợi.')}
              title="Bỏ khỏi hàng đợi"
              aria-label="Bỏ bài"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Sparkles size={32} />}
          title="Hàng đợi đang trống"
          description={
            availability?.exhausted
              ? 'Tất cả bài phù hợp đã được hát hết. Bạn có thể bấm "Tạo lượt tiếp" để dùng lại bài trước đó.'
              : 'Hãy tạo lượt đề xuất tiếp theo để thêm tối đa 50 bài mới vào danh sách.'
          }
          actionLabel="Tạo lượt tiếp (+50 bài)"
          actionIcon={<Plus size={16} />}
          onAction={() => void generateNext(false)}
          className="empty-state"
        />
      )}

      {/* =========================================================
          SUBSEQUENT QUEUE (#2, #3, ...)
          ========================================================= */}
      {subsequentQueue.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MusicIcon />
              <h2 style={{ fontSize: '1.15rem' }}>
                Hàng đợi tiếp theo ({subsequentQueue.length})
              </h2>
            </div>

            <button
              disabled={busy}
              onClick={() => void generateNext(false)}
              className="text-button"
              style={{ fontSize: '0.82rem' }}
            >
              <Plus size={16} />
              <span>Thêm bài (+50)</span>
            </button>
          </div>

          <div className="queue-tracklist">
            {subsequentQueue.map((song, index) => {
              const queuePosition = index + 2;
              return (
                <article className="queue-track-item" key={song.id}>
                  {/* Queue Number */}
                  <span className="queue-number" style={{ width: '24px', textAlign: 'center' }}>
                    {String(queuePosition).padStart(2, '0')}
                  </span>

                  {/* Song Title & Artist */}
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '0.94rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {song.song?.title}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {song.song?.artist || 'Chưa rõ nghệ sĩ'}
                    </p>
                  </div>

                  {/* Singer Pair */}
                  <div style={{ flexShrink: 0 }}>
                    <SingerPair
                      singer1={profileById.get(song.singer_1_id)}
                      singer2={profileById.get(song.singer_2_id)}
                      singer1Name={nameById.get(song.singer_1_id)}
                      singer2Name={nameById.get(song.singer_2_id)}
                      size="sm"
                    />
                  </div>

                  {/* Actions for Queue Item */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Prioritize / Move to Top */}
                    <button
                      className="btn-icon"
                      style={{ width: '32px', height: '32px' }}
                      title="Đưa bài lên đầu hàng đợi"
                      aria-label="Đưa lên đầu"
                      onClick={() =>
                        void mutate(
                          () => SessionRepo.prioritize(song.id, minPosition),
                          `Đã đưa "${song.song?.title}" lên đầu!`
                        )
                      }
                    >
                      <ArrowUp size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      className="btn-icon"
                      style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }}
                      title="Bỏ bài"
                      aria-label="Bỏ bài"
                      onClick={() =>
                        void mutate(
                          () => SessionRepo.removeSong(song.id),
                          'Đã bỏ bài khỏi hàng đợi.'
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>

                    {/* Mark Played Directly */}
                    <button
                      className="btn-primary"
                      style={{
                        minHeight: '30px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'none',
                        color: 'var(--neon-emerald)',
                      }}
                      title="Đánh dấu đã hát"
                      onClick={() =>
                        void mutate(
                          () => SessionRepo.setSongState(song.id, true),
                          `Đã hát xong "${song.song?.title}"!`
                        )
                      }
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Button to Generate More Recommendations if Queue has songs */}
      {queued.length > 0 && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => void generateNext(false)}
            style={{ width: '100%', minHeight: '46px' }}
          >
            {busy ? (
              <>
                <EqualizerIcon size="sm" animated={true} />
                <span>Đang phân tích và thêm bài…</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span>Tạo thêm lượt gợi ý (+50 bài)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* =========================================================
          PLAYED SONGS ACCORDION & UNDO
          ========================================================= */}
      {played.length > 0 && (
        <section style={{ margin: '24px 0' }}>
          <button
            onClick={() => setShowPlayed(value => !value)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--neon-emerald)" />
              <span>Đã hát ({played.length} bài)</span>
            </span>
            {showPlayed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showPlayed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {played.map(song => (
                <div
                  key={song.id}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {song.song?.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {nameById.get(song.singer_1_id)} + {nameById.get(song.singer_2_id)}
                      {song.played_at && (
                        <span>
                          {' · '}
                          {new Date(song.played_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="text-button"
                    style={{ fontSize: '0.78rem', color: 'var(--cyan-400)' }}
                    onClick={() =>
                      void mutate(
                        () => SessionRepo.setSongState(song.id, false),
                        `Đã hoàn tác bài "${song.song?.title}" về hàng đợi!`
                      )
                    }
                  >
                    <Undo2 size={14} />
                    <span>Hoàn tác</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      </div>

      {/* Desktop Sticky Session Panel (>=1024px) */}
      <aside className="adaptive-sidebar-col desktop-only-block">
        <div className="session-context-sidebar">
          {/* Section 1: Live Session Stats */}
          <div className="session-context-section">
            <span className="eyebrow" style={{ marginBottom: '10px' }}>
              <Sparkles size={12} /> THỐNG KÊ BUỔI HÁT
            </span>
            <div className="room-stats-bar" style={{ margin: 0 }}>
              <div>
                <strong>{queued.length}</strong>
                <span>Đang chờ</span>
              </div>
              <div>
                <strong style={{ color: 'var(--emerald-400)' }}>{played.length}</strong>
                <span>Đã hát</span>
              </div>
              <div>
                <strong style={{ color: 'var(--cyan-400)' }}>{availability?.unusedSongs ?? '—'}</strong>
                <span>Bài mới</span>
              </div>
              <div>
                <strong>{Object.keys(stats.pairCounts).length}</strong>
                <span>Cặp đã hát</span>
              </div>
            </div>
          </div>

          {/* Section 2: Current & Next Singers indicator */}
          <div className="session-context-section">
            <span className="eyebrow" style={{ marginBottom: '10px' }}>
              <Mic size={12} /> CA SĨ ĐANG & TIẾP THEO
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {spotlightSong && (
                <div style={{ background: 'rgba(6, 182, 212, 0.08)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--neon-cyan)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                    🎤 Đang biểu diễn (#01):
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {spotlightSong.song?.title}
                  </div>
                  <SingerPair
                    singer1={profileById.get(spotlightSong.singer_1_id)}
                    singer2={profileById.get(spotlightSong.singer_2_id)}
                    singer1Name={nameById.get(spotlightSong.singer_1_id)}
                    singer2Name={nameById.get(spotlightSong.singer_2_id)}
                    size="sm"
                  />
                </div>
              )}

              {subsequentQueue[0] ? (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                    ⏭️ Kế tiếp (#02):
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {subsequentQueue[0].song?.title}
                  </div>
                  <SingerPair
                    singer1={profileById.get(subsequentQueue[0].singer_1_id)}
                    singer2={profileById.get(subsequentQueue[0].singer_2_id)}
                    singer1Name={nameById.get(subsequentQueue[0].singer_1_id)}
                    singer2Name={nameById.get(subsequentQueue[0].singer_2_id)}
                    size="sm"
                  />
                </div>
              ) : (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Chưa có bài tiếp theo trong hàng chờ.</p>
              )}
            </div>
          </div>

          {/* Section 3: Participant Turns Breakdown */}
          <div className="session-context-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="eyebrow">
                <Users size={12} /> CÂN BẰNG LƯỢT HÁT
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {room.members.length} người
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {room.members.map(member => {
                const count = stats.turnsByMember[member.id] ?? 0;
                const maxCount = Math.max(1, ...Object.values(stats.turnsByMember));
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MemberAvatar profile={member} size="xs" />
                    <span style={{ fontSize: '0.8rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.display_name}
                    </span>
                    <div style={{ width: '60px', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--grad-primary)', borderRadius: '3px' }} />
                    </div>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', width: '42px', textAlign: 'right' }}>
                      {count} lượt
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Room Controls */}
          <div className="session-context-section">
            <span className="eyebrow" style={{ marginBottom: '10px' }}>
              <Mic size={12} /> ĐIỀU KHIỂN PHÒNG HÁT
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => void generateNext(false)}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '9px 14px', fontSize: '0.84rem' }}
              >
                <Plus size={15} color="var(--neon-cyan)" />
                <span>Thêm 50 bài vào hàng chờ</span>
              </button>

              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => setConfirmRecycle(true)}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '9px 14px', fontSize: '0.84rem' }}
              >
                <RefreshCw size={15} color="var(--neon-purple)" />
                <span>Xếp lại / Nạp bài tái sử dụng</span>
              </button>

              <button
                className="btn-secondary"
                onClick={() => setConfirmComplete(true)}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '9px 14px',
                  fontSize: '0.84rem',
                  color: '#fb7185',
                  borderColor: 'rgba(244, 63, 94, 0.35)',
                  background: 'rgba(244, 63, 94, 0.08)',
                }}
              >
                <Trash2 size={15} color="#fb7185" />
                <span>Kết thúc & Lưu buổi hát</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>

      {/* Recycle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmRecycle}
        title="Không còn bài hát mới"
        description="Buổi hát này đã dùng hết tất cả các bài hát song ca chung của những người tham dự. Bạn có muốn tạo lượt tiếp bằng cách dùng lại các bài trước đó không?"
        confirmLabel="Dùng lại bài trước"
        cancelLabel="Hủy"
        variant="warning"
        onConfirm={() => void generateNext(true)}
        onCancel={() => setConfirmRecycle(false)}
      />

      {/* Complete Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmComplete}
        title="Kết thúc buổi hát?"
        description="Toàn bộ danh sách bài đã hát, cặp song ca và lượt hát sẽ được lưu lại vào Lịch sử buổi hát để bạn xem lại sau."
        confirmLabel="Kết thúc & Lưu"
        cancelLabel="Tiếp tục hát"
        variant="danger"
        onConfirm={() => void complete()}
        onCancel={() => setConfirmComplete(false)}
      />

      {/* Why Recommended Inspection Dialog */}
      {inspectionSong && (
        <div className="modal-overlay" onClick={() => setInspectionSong(null)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
          >
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
              Thông tin đề xuất bài hát
            </h3>
            <p style={{ fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: '14px' }}>
              {inspectionSong.song?.title}
            </p>

            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong>Cặp song ca:</strong> {nameById.get(inspectionSong.singer_1_id)} + {nameById.get(inspectionSong.singer_2_id)}
              </div>
              <div>
                <strong>Người cùng biết hát:</strong>{' '}
                {inspectionSong.eligible_singer_ids.map(id => nameById.get(id)).join(', ')}
              </div>
              <div>
                <strong>Điểm cân bằng:</strong> {Math.round(inspectionSong.score)}
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => setInspectionSong(null)}
              style={{ width: '100%', marginTop: '20px' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MusicIcon() {
  return (
    <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
      🎶
    </span>
  );
}
