import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { MemberSongRepo, SessionRepo } from '../repositories';
import { KaraokeSession, Song } from '../types';
import { AddSongModal } from '../components/AddSongModal';
import { Plus, Mic, Users, Music, Flame, Sparkles, ChevronRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentGroup, currentMember, members } = useApp();

  const [mySongsCount, setMySongsCount] = useState<number>(0);
  const [lastSession, setLastSession] = useState<KaraokeSession | null>(null);
  const [trendingSongs, setTrendingSongs] = useState<{ song: Song; count: number; memberNames: string[] }[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadHomeData = async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      // 1. My songs count
      if (currentMember) {
        const mySongs = await MemberSongRepo.getMemberSongs(currentMember.id);
        setMySongsCount(mySongs.length);
      }

      // 2. Last session
      const sessions = await SessionRepo.getSessionsByGroup(currentGroup.id);
      if (sessions.length > 0) {
        setLastSession(sessions[0]);
      } else {
        setLastSession(null);
      }

      // 3. Trending songs in group (most popular across all members)
      const allGroupMemberSongs = await MemberSongRepo.getAllMemberSongsForGroup(currentGroup.id);
      const songMap = new Map<string, { song: Song; members: Set<string> }>();

      for (const ms of allGroupMemberSongs) {
        if (!ms.song) continue;
        const entry = songMap.get(ms.song_id) || { song: ms.song, members: new Set() };
        const member = members.find(m => m.id === ms.member_id);
        if (member) entry.members.add(member.display_name);
        songMap.set(ms.song_id, entry);
      }

      const sortedTrending = Array.from(songMap.values())
        .map(item => ({
          song: item.song,
          count: item.members.size,
          memberNames: Array.from(item.members),
        }))
        .filter(item => item.count >= 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      setTrendingSongs(sortedTrending);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Home:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [currentGroup?.id, currentMember?.id, members.length]);

  return (
    <div className="page-container">
      {/* Header Greeting */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Chào mừng bạn đến với
            </span>
            <h1 style={{ fontSize: '1.65rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Xin chào, {currentMember ? currentMember.display_name : 'Bạn'}</span>
              <span style={{ fontSize: '1.4rem' }}>{currentMember?.avatar || '🎤'}</span>
            </h1>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
            style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Thêm bài</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {/* Stat 1: My Songs */}
        <div
          className="glass-card-interactive"
          onClick={() => navigate('/my-songs')}
          style={{ textAlign: 'center', padding: '12px 6px' }}
        >
          <div style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }}>
            <Music size={20} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>{mySongsCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bài của tôi</div>
        </div>

        {/* Stat 2: Members */}
        <div
          className="glass-card-interactive"
          onClick={() => navigate('/group')}
          style={{ textAlign: 'center', padding: '12px 6px' }}
        >
          <div style={{ color: 'var(--neon-purple)', marginBottom: '4px' }}>
            <Users size={20} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>{members.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thành viên</div>
        </div>

        {/* Stat 3: Last Outing */}
        <div
          className="glass-card-interactive"
          onClick={() => navigate('/history')}
          style={{ textAlign: 'center', padding: '12px 6px' }}
        >
          <div style={{ color: 'var(--neon-amber)', marginBottom: '4px' }}>
            <Sparkles size={20} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lastSession ? new Date(lastSession.created_at || '').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--/--'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Buổi gần nhất</div>
        </div>
      </div>

      {/* Main Karaoke Outing Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
          border: '1px solid var(--border-glow)',
          padding: '20px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.8rem' }}>🎉</span>
          <div>
            <h2 style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>Hôm nay đi Karaoke?</h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Chọn ai đi hôm nay, GinKaraoke sẽ tự tìm bài hát chung và đề xuất playlist tối ưu!
            </p>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/karaoke')}
          style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
        >
          <Mic size={20} />
          <span>Bắt đầu chọn người đi hát</span>
        </button>
      </div>

      {/* Section: "Những bài nhóm có nhiều người cùng hát" */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={18} color="var(--neon-rose)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Bài nhóm nhiều người cùng biết</h2>
          </div>
          <button
            onClick={() => navigate('/karaoke')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--neon-cyan)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>Tạo playlist</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {trendingSongs.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.9rem' }}>Chưa có bài hát nào trong nhóm.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-secondary"
              style={{ marginTop: '10px', fontSize: '0.82rem' }}
            >
              + Thêm bài đầu tiên
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {trendingSongs.map((item, idx) => (
              <div
                key={item.song.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--grad-sunset)' : 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.song.title}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.song.artist || 'Không rõ ca sĩ'} • {item.memberNames.join(', ')}
                    </div>
                  </div>
                </div>

                <div className="badge badge-cyan" style={{ marginLeft: '8px', flexShrink: 0 }}>
                  <Users size={12} />
                  <span>{item.count}/{members.length}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddSongModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadHomeData}
      />
    </div>
  );
};
