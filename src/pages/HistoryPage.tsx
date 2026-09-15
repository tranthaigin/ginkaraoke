import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SessionRepo } from '../repositories';
import { KaraokeSession, SessionSong, Member } from '../types';
import { History, Calendar, Music, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface SessionDetailMap {
  [sessionId: string]: {
    members: Member[];
    songs: SessionSong[];
  };
}

export const HistoryPage: React.FC = () => {
  const { currentGroup, showToast } = useApp();

  const [sessions, setSessions] = useState<KaraokeSession[]>([]);
  const [details, setDetails] = useState<SessionDetailMap>({});
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      const list = await SessionRepo.getSessionsByGroup(currentGroup.id);
      setSessions(list);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải lịch sử các buổi hát', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [currentGroup?.id]);

  const toggleExpand = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      return;
    }

    setExpandedSessionId(sessionId);

    // Fetch details if not yet cached
    if (!details[sessionId]) {
      try {
        const data = await SessionRepo.getSessionDetails(sessionId);
        if (data) {
          setDetails(prev => ({
            ...prev,
            [sessionId]: {
              members: data.members,
              songs: data.songs,
            },
          }));
        }
      } catch (err) {
        console.error('Lỗi tải chi tiết buổi hát:', err);
      }
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Lịch sử các buổi hát</span>
          <span style={{ fontSize: '1.2rem' }}>📜</span>
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Xem lại những buổi đi Karaoke cùng nhóm bạn và các bài đã hát
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
          <History size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Chưa có buổi hát nào được ghi nhận</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Khi đi Karaoke, tạo playlist và hoàn thành buổi hát sẽ lưu vào đây!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map(session => {
            const isExpanded = expandedSessionId === session.id;
            const sessionData = details[session.id];
            const sungCount = sessionData ? sessionData.songs.filter(s => s.sung).length : 0;
            const dateStr = new Date(session.created_at || '').toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <div
                key={session.id}
                className="glass-card"
                style={{ padding: '16px' }}
              >
                {/* Session Card Summary */}
                <div
                  onClick={() => toggleExpand(session.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={15} color="var(--neon-purple)" />
                      <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                        {session.title || `Karaoke ${dateStr}`}
                      </h3>
                      {session.status === 'active' && (
                        <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                          Đang diễn ra
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {dateStr}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="badge badge-cyan" style={{ fontSize: '0.74rem' }}>
                        <Music size={11} />
                        <span>{sessionData ? `${sungCount} bài đã hát` : 'Xem chi tiết'}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    {sessionData ? (
                      <div>
                        {/* Participants list */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                            THÀNH VIÊN THAM GIA ({sessionData.members.length}):
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {sessionData.members.map(m => (
                              <span
                                key={m.id}
                                className="badge"
                                style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff' }}
                              >
                                {m.avatar} {m.display_name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Songs Sung */}
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                            DANH SÁCH BÀI ĐÃ HÁT ({sessionData.songs.filter(s => s.sung).length}):
                          </div>
                          {sessionData.songs.filter(s => s.sung).length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Chưa có bài nào được đánh dấu đã hát trong buổi này.
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {sessionData.songs
                                .filter(s => s.sung)
                                .map(s => (
                                  <div
                                    key={s.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '6px 10px',
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'rgba(255, 255, 255, 0.03)',
                                      fontSize: '0.84rem',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <CheckCircle2 size={14} color="#34d399" />
                                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{s.song?.title}</span>
                                    </div>
                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                      {s.song?.artist}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đang tải chi tiết...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
