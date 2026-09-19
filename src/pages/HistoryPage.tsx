import { useCallback, useEffect, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, History, Mic, Music, Sparkles, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SessionRepo } from '../repositories';
import type { KaraokeSession } from '../types';
import type { SessionDetails } from '../repositories/types';
import { calculateSessionStats } from '../services/recommendation/engine';
import { MemberAvatar } from '../components/MemberAvatar';
import { EmptyState } from '../components/EmptyState';

export function HistoryPage() {
  const { currentGroup, showToast } = useApp();
  const [sessions, setSessions] = useState<KaraokeSession[]>([]);
  const [details, setDetails] = useState<Record<string, SessionDetails>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      setSessions(await SessionRepo.list(currentGroup.id));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải lịch sử.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentGroup, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (details[id]) return;
    try {
      const result = await SessionRepo.details(id);
      if (result) setDetails(value => ({ ...value, [id]: result }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải chi tiết.', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <section style={{ marginBottom: '20px' }}>
        <span className="eyebrow">
          <Sparkles size={12} /> KỶ NIỆM ĐÊM HÁT
        </span>
        <h1 style={{ fontSize: '1.6rem', marginTop: '4px' }}>Lịch sử những buổi hát</h1>
        <p className="muted" style={{ fontSize: '0.84rem', marginTop: '2px' }}>
          Lưu lại người tham gia, bài hát và kỷ niệm của hội bạn.
        </p>
      </section>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
          <p>Đang tải lịch sử các buổi hát…</p>
        </div>
      ) : !sessions.length ? (
        <EmptyState
          icon={<History size={32} />}
          title="Chưa có buổi hát nào được lưu"
          description="Khi bạn hoàn tất một buổi hát trong phòng Karaoke, bài hát và người thể hiện sẽ được lưu giữ tại đây."
        />
      ) : (
        <div className="adaptive-history-grid">
          {sessions.map(session => {
            const data = details[session.id];
            const played = data?.songs.filter(song => song.state === 'PLAYED') ?? [];
            const names = new Map(data?.members.map(member => [member.id, member.display_name]) ?? []);
            const stats = data
              ? calculateSessionStats(
                  data.members.map(member => member.id),
                  data.songs.map(song => ({
                    songId: song.song_id,
                    singerIds: [song.singer_1_id, song.singer_2_id],
                    state: song.state,
                  }))
                )
              : null;

            const isExpanded = expanded === session.id;

            return (
              <article key={session.id} className="glass-card" style={{ padding: '16px' }}>
                {/* Session Header Card Toggle */}
                <button
                  onClick={() => void toggle(session.id)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    color: 'inherit',
                    cursor: 'pointer',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        <Calendar size={11} />
                        <span>{new Date(session.created_at).toLocaleDateString('vi-VN')}</span>
                      </span>

                      {session.status === 'active' && (
                        <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          <Mic size={10} /> Đang diễn ra
                        </span>
                      )}
                      {session.selection_mode === 'RANDOM' && (
                        <span className="badge badge-amber" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          Ngẫu nhiên
                        </span>
                      )}
                    </div>

                    <h2
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                      }}
                    >
                      {session.name}
                    </h2>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {data
                        ? `${data.members.length} người tham gia · ${played.length} bài đã hát`
                        : session.status === 'active'
                        ? 'Nhấn để xem bài đang hát'
                        : 'Nhấn để xem chi tiết buổi hát'}
                    </p>
                  </div>

                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Expanded Session Detail */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      marginTop: '14px',
                      paddingTop: '14px',
                      animation: 'pageFadeIn 0.2s ease',
                    }}
                  >
                    {!data ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Đang tải chi tiết…</p>
                    ) : (
                      <>
                        {/* Smart sessions track assigned turns; random sessions only track source playlists. */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--cyan-400)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '8px' }}>
                            {session.selection_mode === 'RANDOM'
                              ? 'PLAYLIST NGUỒN ĐÃ CHỌN:'
                              : 'LƯỢT HÁT CỦA CÁC THÀNH VIÊN:'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {data.members.map(member => (
                              <div
                                key={member.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  fontSize: '0.76rem',
                                }}
                              >
                                <MemberAvatar profile={member} size="xs" />
                                <span>{member.display_name}</span>
                                {session.selection_mode !== 'RANDOM' && <strong style={{ color: 'var(--neon-cyan)' }}>
                                  {stats?.turnsByMember[member.id] ?? 0} lượt
                                </strong>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Song List */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Music size={15} color="var(--violet-400)" />
                            <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                              Danh sách bài hát ({data.songs.length})
                            </h3>
                          </div>

                          {data.songs.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {data.songs.map(song => (
                                <div
                                  key={song.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid var(--border-subtle)',
                                    fontSize: '0.84rem',
                                  }}
                                >
                                  <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                                    <strong style={{ color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {song.song?.title}
                                    </strong>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                      {song.song?.artist}
                                      {song.state === 'PLAYED' && song.played_at ? ` · Đã hát lúc ${new Date(song.played_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ' · Chưa hát'}
                                    </span>
                                  </div>

                                  <span
                                    style={{
                                      fontSize: '0.76rem',
                                      color: 'var(--neon-cyan)',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {session.selection_mode === 'RANDOM'
                                      ? `Có trong: ${song.eligible_singer_ids.map(id => names.get(id)).filter(Boolean).join(', ')}`
                                      : song.singer_1_id
                                        ? `${names.get(song.singer_1_id)}${song.singer_2_id ? ` + ${names.get(song.singer_2_id)}` : ' · Solo'}`
                                        : 'Chưa phân công'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="muted" style={{ fontSize: '0.8rem' }}>
                              Buổi này chưa tạo bài hát nào.
                            </p>
                          )}
                        </div>

                        {/* Session Statistics Summary */}
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            fontSize: '0.76rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Users size={13} color="var(--neon-purple)" />
                          {session.selection_mode === 'RANDOM' ? (
                            <span>{data.members.length} playlist nguồn · Không phân công người hát</span>
                          ) : <>
                            <span>{Object.keys(stats?.pairCounts ?? {}).length} cặp khác nhau</span>
                            <span>·</span>
                            <span>
                              {Object.values(stats?.pairCounts ?? {}).reduce(
                                (sum, count) => sum + Math.max(0, count - 1),
                                0
                              )}{' '}
                              lượt lặp lại cặp
                            </span>
                            <span>·</span>
                          </>}
                          <span>{data.batches.length} lượt tạo danh sách</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
