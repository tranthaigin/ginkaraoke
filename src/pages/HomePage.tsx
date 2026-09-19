import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Check, ChevronRight, Copy, Flame, History, Mic, Music, Plus, Sparkles, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MemberSongRepo, SessionRepo } from '../repositories';
import type { KaraokeSession, Song } from '../types';
import { AddSongModal } from '../components/AddSongModal';
import { MemberAvatar } from '../components/MemberAvatar';
import { EqualizerIcon } from '../components/EqualizerIcon';

export function HomePage() {
  const navigate = useNavigate();
  const { profile, currentGroup, members, showToast } = useApp();
  const [myCount, setMyCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<KaraokeSession[]>([]);
  const [popular, setPopular] = useState<{ song: Song; count: number }[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      const [mine, groupSongs, sessions] = await Promise.all([
        MemberSongRepo.getMine(),
        MemberSongRepo.getForGroup(currentGroup.id),
        SessionRepo.list(currentGroup.id),
      ]);
      setMyCount(mine.length);
      setRecentSessions(sessions.slice(0, 3));

      // Aggregate songs known by multiple group members
      const map = new Map<string, { song: Song; users: Set<string> }>();
      groupSongs.forEach(item => {
        if (!item.song) return;
        const value = map.get(item.song_id) ?? { song: item.song, users: new Set<string>() };
        value.users.add(item.user_id);
        map.set(item.song_id, value);
      });

      setPopular(
        [...map.values()]
          .map(value => ({ song: value.song, count: value.users.size }))
          .sort((a, b) => b.count - a.count || a.song.title.localeCompare(b.song.title))
          .slice(0, 12)
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải trang chủ.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentGroup, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyCode = async () => {
    if (!currentGroup) return;
    try {
      await navigator.clipboard.writeText(currentGroup.join_code);
      setCopied(true);
      showToast('Đã sao chép mã nhóm! 📋', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Không thể sao chép mã.', 'error');
    }
  };

  const lastSession = recentSessions[0] ?? null;

  return (
    <div className="page-container">
      {/* Top Bar: Personal Greeting + Integrated Context */}
      <section className="home-top-bar">
        <div>
          <span className="eyebrow">
            <Sparkles size={12} /> SẴN SÀNG LÊN MIC?
          </span>
          <h1 className="home-greeting-lead">
            Chào {profile?.display_name?.split(' ')[0]} 👋
          </h1>
          <p className="muted" style={{ marginTop: '2px' }}>
            Hôm nay quẩy cùng <strong>{currentGroup?.name}</strong> · {members.length} thành viên · {loading ? '…' : myCount} bài trong playlist của bạn
          </p>
        </div>

        {/* Desktop Social Group Capsule (>=1024px) */}
        <div className="home-social-badge">
          {/* Overlapping member avatars */}
          <div style={{ display: 'flex', marginLeft: '2px' }}>
            {members.slice(0, 4).map((m, i) => (
              <div key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
                <MemberAvatar profile={m.profile} size="xs" />
              </div>
            ))}
          </div>

          <button
            onClick={() => void copyCode()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255, 255, 255, 0.07)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'monospace, var(--font-display)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--neon-cyan)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
            title="Nhấn để sao chép mã mời bạn bè"
          >
            <span>Mã: {currentGroup?.join_code}</span>
            {copied ? <Check size={12} color="var(--emerald-400)" /> : <Copy size={11} />}
          </button>

          <button
            onClick={() => navigate('/group')}
            className="text-link"
            style={{ fontSize: '0.78rem' }}
          >
            Hội bạn ({members.length})
          </button>
        </div>

        {/* Mobile profile avatar fallback */}
        <div className="mobile-only-block">
          <MemberAvatar profile={profile} size="md" />
        </div>
      </section>

      {/* Mobile-Only Stat Grid (<1024px, completely hidden on Desktop) */}
      <div className="stat-grid mobile-only-block" style={{ marginBottom: '16px' }}>
        <button
          className="stat-card"
          onClick={() => navigate('/my-songs')}
          title="Xem playlist cá nhân"
        >
          <Music size={20} color="var(--neon-cyan)" />
          <strong>{loading ? '…' : myCount}</strong>
          <span>Bài của tôi</span>
        </button>

        <button
          className="stat-card"
          onClick={() => navigate('/group')}
          title="Xem thành viên nhóm"
        >
          <Users size={20} color="var(--neon-purple)" />
          <strong>{members.length}</strong>
          <span>Thành viên</span>
        </button>

        <button
          className="stat-card"
          onClick={() => navigate('/history')}
          title="Xem lịch sử hát"
        >
          <Flame size={20} color="var(--neon-rose)" />
          <strong>
            {lastSession
              ? new Date(lastSession.created_at).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                })
              : '—'}
          </strong>
          <span>Gần nhất</span>
        </button>
      </div>

      {/* PRIMARY: Hero Karaoke Stage (One Clear, High-Impact Music CTA) */}
      <section className="home-hero-stage">
        <div style={{ maxWidth: '620px', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <EqualizerIcon size="sm" animated={true} />
            <span className="eyebrow" style={{ color: 'var(--neon-cyan)' }}>
              PHÒNG KARAOKE THÔNG MINH
            </span>
          </div>

          <h2 style={{ fontSize: '1.85rem', color: '#ffffff', margin: '4px 0 10px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Lên mic cùng hội bạn ngay!
          </h2>

          <p style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '0.94rem', lineHeight: 1.6 }}>
            GinKaraoke tự động phân cặp song ca công bằng, ưu tiên bài tủ và sẵn sàng danh sách hát tức thì cho nhóm.
          </p>
        </div>

        <div style={{ zIndex: 1 }}>
          <button
            className="home-hero-btn"
            onClick={() => navigate('/karaoke')}
            title="Bắt đầu hoặc vào phòng hát karaoke"
          >
            <Mic size={22} color="#0284c7" />
            <span>Vào phòng hát ngay</span>
          </button>
        </div>
      </section>

      {/* SECONDARY: Shared Songs Repertoire (Meaningful Desktop Music Grid) */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Flame size={22} color="var(--neon-rose)" />
            <h2 style={{ fontSize: '1.3rem' }}>Bài hát nhóm cùng biết hát</h2>
            {popular.length > 0 && (
              <span className="badge badge-purple" style={{ fontSize: '0.74rem' }}>
                {popular.length} bài
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setAdding(true)}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem', minHeight: '34px' }}
            >
              <Plus size={15} color="var(--neon-cyan)" />
              <span>Thêm bài mới</span>
            </button>

            <button
              onClick={() => navigate('/my-songs')}
              className="text-link"
              style={{ fontSize: '0.82rem' }}
            >
              <span>Playlist của tôi</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {popular.length > 0 ? (
          <div className="shared-songs-music-grid">
            {popular.map((item, index) => (
              <div
                key={item.song.id}
                className="shared-song-row"
                onClick={() => navigate('/karaoke')}
                title="Bấm để vào phòng hát bài này"
              >
                {/* Track Index */}
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color:
                      index === 0
                        ? 'var(--neon-cyan)'
                        : index === 1
                        ? 'var(--violet-400)'
                        : index === 2
                        ? '#fbbf24'
                        : 'var(--text-muted)',
                    width: '26px',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Song Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.94rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.song.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.song.artist || 'Chưa rõ nghệ sĩ'}
                  </div>
                </div>

                {/* Overlap Context Badge */}
                <span
                  className="badge badge-cyan"
                  style={{ flexShrink: 0, fontSize: '0.74rem' }}
                  title={`${item.count} thành viên trong nhóm biết hát bài này`}
                >
                  <Users size={12} />
                  <span>{item.count}/{members.length} bạn</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="shared-songs-empty-inline">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(0, 242, 254, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--neon-cyan)',
                  flexShrink: 0,
                }}
              >
                <Music size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  Chưa có bài hát chung giữa các bạn
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Thêm những bài hát bạn biết vào playlist cá nhân để GinKaraoke tự động tìm bài trùng cho nhóm!
                </p>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => setAdding(true)}
              style={{ padding: '8px 18px', fontSize: '0.84rem', minHeight: '36px' }}
            >
              <Plus size={16} />
              <span>Thêm bài ngay</span>
            </button>
          </div>
        )}
      </section>

      {/* TERTIARY: Recent Karaoke Sessions Context */}
      {recentSessions.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="var(--violet-400)" />
              <h2 style={{ fontSize: '1.2rem' }}>Kỷ niệm buổi hát gần đây</h2>
            </div>

            <button
              onClick={() => navigate('/history')}
              className="text-link"
              style={{ fontSize: '0.82rem' }}
            >
              <span>Xem toàn bộ lịch sử</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="recent-sessions-grid">
            {recentSessions.map(sess => (
              <div
                key={sess.id}
                className="recent-session-card"
                onClick={() => navigate('/history')}
                title="Bấm để xem lại chi tiết buổi hát"
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      <Calendar size={10} />
                      <span>{new Date(sess.created_at).toLocaleDateString('vi-VN')}</span>
                    </span>

                    {sess.status === 'active' && (
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        <Mic size={10} /> Đang diễn ra
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.02rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {sess.name}
                  </h3>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Bấm để xem lại các cặp song ca & bài đã diễn
                  </p>
                </div>

                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Song Modal */}
      <AddSongModal isOpen={adding} onClose={() => setAdding(false)} onSuccess={load} />
    </div>
  );
}
