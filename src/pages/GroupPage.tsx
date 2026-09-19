import { useState, type FormEvent } from 'react';
import { Check, Copy, Crown, LogOut, Plus, Sparkles, UserMinus, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MemberAvatar } from '../components/MemberAvatar';

export function GroupPage() {
  const {
    currentGroup,
    groups,
    members,
    profile,
    user,
    isBusy,
    isOnline,
    createGroup,
    joinGroup,
    selectGroup,
    removeMember,
    saveProfile,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'join' | 'create' | null>(null);
  const [value, setValue] = useState('');
  const [name, setName] = useState(profile?.display_name ?? '');
  const [copied, setCopied] = useState(false);
  const owner = currentGroup?.owner_id === user?.id;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!isOnline) throw new Error('Bạn đang offline. Thao tác chưa được gửi.');
      if (mode === 'create') await createGroup(value);
      if (mode === 'join') await joinGroup(value);
      setMode(null);
      setValue('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật nhóm.', 'error');
    }
  };

  const copy = async () => {
    if (!currentGroup) return;
    try {
      await navigator.clipboard.writeText(currentGroup.join_code);
      setCopied(true);
      showToast('Đã sao chép mã tham gia nhóm! 📋', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Không thể sao chép mã.', 'error');
    }
  };

  const remove = async (id: string, displayName: string) => {
    if (!window.confirm(id === user?.id ? 'Bạn muốn rời khỏi nhóm này?' : `Xóa ${displayName} khỏi nhóm?`)) return;
    try {
      await removeMember(id);
      showToast('Đã cập nhật danh sách thành viên.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật thành viên.', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Page Heading */}
      <section style={{ marginBottom: '20px' }}>
        <span className="eyebrow">
          <Sparkles size={12} /> KHÔNG GIAN BẠN BÈ
        </span>
        <h1 style={{ fontSize: '1.75rem', marginTop: '4px' }}>Hội bạn của tôi</h1>
        <p className="muted" style={{ fontSize: '0.86rem', marginTop: '2px' }}>
          Quản lý thành viên, chia sẻ mã tham gia và chuyển đổi giữa các nhóm karaoke.
        </p>
      </section>

      {/* Adaptive Split Layout (Main Member Area Left, Group & Settings Sidebar Right) */}
      <div className="adaptive-split-layout">
        {/* Left Column: Wider Member Grid */}
        <div className="adaptive-main-col">
          {/* Members Section */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--neon-cyan)" />
                <h2 style={{ fontSize: '1.2rem' }}>Thành viên trong nhóm ({members.length})</h2>
              </div>
              <span className="badge badge-cyan">{currentGroup?.name}</span>
            </div>

            <div className="adaptive-members-grid">
              {members.map(member => {
                const memberProfile = member.profile;
                if (!memberProfile) return null;
                const isMe = member.user_id === user?.id;
                const isGroupOwner = member.role === 'owner';
                const canRemove = owner && !isGroupOwner;
                const canLeave = isMe && !owner;

                return (
                  <div
                    key={member.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    <MemberAvatar profile={memberProfile} size="md" />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.96rem',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {memberProfile.display_name}
                        </span>

                        {isMe && (
                          <span className="badge" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--neon-cyan)', fontSize: '0.66rem', padding: '1px 6px' }}>
                            Bạn
                          </span>
                        )}

                        {isGroupOwner && (
                          <span className="badge badge-amber" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                            <Crown size={10} /> Chủ nhóm
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Tham gia: {member.joined_at ? new Date(member.joined_at).toLocaleDateString('vi-VN') : 'Thành viên'}
                      </div>
                    </div>

                    {(canRemove || canLeave) && (
                      <button
                        onClick={() => void remove(member.user_id, memberProfile.display_name)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-xs)',
                          transition: 'color var(--transition-fast)',
                        }}
                        title={canLeave ? 'Rời khỏi nhóm' : 'Xóa thành viên'}
                        aria-label={canLeave ? 'Rời nhóm' : 'Xóa thành viên'}
                      >
                        {canLeave ? <LogOut size={16} /> : <UserMinus size={16} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Group Info, Join Code, Group Switcher, and Profile Settings */}
        <aside className="adaptive-sidebar-col">
          {/* Active Group Identity & Join Code */}
          <section
            className="glass-card"
            style={{
              padding: '22px',
              background: 'linear-gradient(145deg, rgba(28, 42, 76, 0.9) 0%, rgba(13, 20, 36, 0.9) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.35)',
              boxShadow: 'var(--shadow-md), 0 0 25px rgba(0, 242, 254, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ fontSize: '0.7rem' }}>
                NHÓM ĐANG HOẠT ĐỘNG
              </span>
              {owner && (
                <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                  <Crown size={12} /> Chủ nhóm
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.45rem', marginBottom: '14px', fontFamily: 'var(--font-display)' }}>
              {currentGroup?.name}
            </h2>

            {/* Join Code Pill with 1-Tap Copy */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                MÃ THAM GIA (CHIA SẺ CHO BẠN BÈ):
              </div>
              <button
                onClick={() => void copy()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1.5px dashed var(--neon-cyan)',
                  color: 'var(--neon-cyan)',
                  fontFamily: 'monospace, var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                title="Nhấn để sao chép mã nhóm"
              >
                <span>{currentGroup?.join_code}</span>
                {copied ? <Check size={18} color="var(--emerald-400)" /> : <Copy size={16} />}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={() => setMode('join')}
                style={{ width: '100%', fontSize: '0.86rem' }}
              >
                Nhập mã nhóm
              </button>
              <button
                className="btn-primary"
                onClick={() => setMode('create')}
                style={{ width: '100%', fontSize: '0.86rem' }}
              >
                <Plus size={16} /> Tạo nhóm mới
              </button>
            </div>
          </section>

          {/* Group Switcher Chips if in multiple groups */}
          {groups.length > 1 && (
            <section className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users size={18} color="var(--neon-purple)" />
                <h2 style={{ fontSize: '1.1rem' }}>Các nhóm của tôi ({groups.length})</h2>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {groups.map(group => {
                  const isActive = group.id === currentGroup?.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => void selectGroup(group)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-full)',
                        background: isActive ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.06)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        border: isActive ? 'none' : '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Profile Edit Card */}
          <section className="glass-card" style={{ padding: '20px' }}>
            <span className="eyebrow" style={{ marginBottom: '8px' }}>
              HỒ SƠ CÁ NHÂN
            </span>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Tên hiển thị trong nhóm</h2>

            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!name.trim()) return;
                try {
                  await saveProfile(name.trim());
                  showToast('Đã lưu tên hiển thị thành công! ✨', 'success');
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Không thể lưu tên.', 'error');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <input
                className="input-text"
                value={name}
                maxLength={60}
                onChange={e => setName(e.target.value)}
                placeholder="Tên của bạn trong nhóm..."
              />
              <button
                type="submit"
                className="btn-secondary"
                disabled={isBusy || !name.trim() || name.trim() === profile?.display_name}
                style={{ alignSelf: 'flex-start', minHeight: '40px', fontSize: '0.86rem' }}
              >
                Lưu tên hiển thị
              </button>
            </form>
          </section>
        </aside>
      </div>

      {/* Join or Create Group Modal */}
      {mode && (
        <div className="modal-overlay" onClick={() => setMode(null)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
              {mode === 'create' ? 'Tạo nhóm karaoke mới' : 'Tham gia nhóm bạn bè'}
            </h2>
            <p className="muted" style={{ fontSize: '0.84rem', marginBottom: '16px' }}>
              {mode === 'create'
                ? 'Đặt tên cho nhóm bạn (VD: Hội Đồng Nghiệp, Gia Đình, Bạn Cấp 3...)'
                : 'Nhập mã 6 ký tự được chủ nhóm chia sẻ.'}
            </p>

            <form onSubmit={submit}>
              <div style={{ marginBottom: '18px' }}>
                <label className="field-label" htmlFor="group-input">
                  {mode === 'create' ? 'TÊN NHÓM MỚI' : 'MÃ THAM GIA'}
                </label>
                <input
                  id="group-input"
                  className={`input-text ${mode === 'join' ? 'code-input' : ''}`}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={mode === 'create' ? 'VD: Team Nhậu & Hát' : 'VD: ABC123'}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setMode(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={isBusy || !value.trim()}>
                  {mode === 'create' ? 'Tạo ngay' : 'Tham gia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
