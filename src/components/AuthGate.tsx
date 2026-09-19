import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, LoaderCircle, Plus, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GinKaraokeLogo } from './GinKaraokeLogo';
import { MemberAvatar } from './MemberAvatar';

export function AuthGate() {
  const {
    authStatus,
    authError,
    user,
    profile,
    groups,
    isBusy,
    signInWithGoogle,
    signOut,
    saveProfile,
    createGroup,
    joinGroup,
    refresh,
  } = useApp();

  const [name, setName] = useState(profile?.display_name ?? user?.user_metadata.full_name ?? '');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [localError, setLocalError] = useState<string | null>(null);

  const perform = async (action: () => Promise<void>) => {
    setLocalError(null);
    try {
      await action();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
    }
  };

  // Loading State
  if (authStatus === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-atmosphere-glow" />
        <GinKaraokeLogo size="lg" glow={true} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
          <LoaderCircle className="spin" size={24} color="var(--neon-cyan)" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 600 }}>
            Đang khởi động GinKaraoke…
          </p>
        </div>
      </div>
    );
  }

  // Config Error State
  if (authStatus === 'config_error') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle color="var(--neon-amber)" size={32} />
            <h2 style={{ fontSize: '1.25rem' }}>Chưa cấu hình Supabase</h2>
          </div>
          <p className="muted">{authError}</p>
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            Sao chép file <code>.env.example</code> thành <code>.env.local</code> và điền <code>VITE_SUPABASE_URL</code> cùng <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </div>
        </div>
      </div>
    );
  }

  // Signed Out State: Modern Premium Login
  if (authStatus === 'signed_out') {
    return (
      <div className="auth-screen">
        <div className="auth-atmosphere-glow" />

        <div className="auth-card login-card">
          {/* Brand Logo & Lockup */}
          <GinKaraokeLogo size="xl" glow={true} />

          <div style={{ margin: '6px 0 12px' }}>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                marginBottom: '4px',
              }}
            >
              GinKaraoke
            </h1>
            <p className="login-tagline">Your songs. Your crew. Your karaoke night.</p>
          </div>

          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              maxWidth: '340px',
              margin: '0 auto 16px',
            }}
          >
            Tạo phòng hát thông minh, tự động tìm bài trùng và phân chia cặp song ca công bằng cho nhóm bạn.
          </p>

          {(authError || localError) && (
            <div className="error-banner" style={{ width: '100%', textAlign: 'left' }}>
              {authError || localError}
            </div>
          )}

          {/* Google Sign-in CTA */}
          <button
            className="google-auth-button"
            onClick={() => void perform(signInWithGoogle)}
            aria-label="Tiếp tục với Google"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>

          <p className="fine-print" style={{ marginTop: '10px' }}>
            Đăng nhập an toàn qua Supabase Auth. Không cần mật khẩu.
          </p>
        </div>
      </div>
    );
  }

  // Auth Error when user is known
  if (authError && !profile) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle color="var(--neon-rose)" size={28} />
            <h2>Không thể tải dữ liệu tài khoản</h2>
          </div>
          <div className="error-banner">{authError}</div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => void perform(refresh)}>
              Thử lại
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => void perform(signOut)}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Profile Onboarding
  if (!profile?.onboarding_completed) {
    const submitProfile = (event: FormEvent) => {
      event.preventDefault();
      void perform(() => saveProfile(name, profile?.avatar_url));
    };

    return (
      <div className="auth-screen">
        <div className="auth-atmosphere-glow" />

        <form className="auth-card" onSubmit={submitProfile}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="eyebrow">BƯỚC 1 / 2</span>
            <span className="badge badge-cyan">HỒ SƠ CA SĨ</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
            <MemberAvatar
              profile={{ display_name: name || 'Bạn', avatar_url: profile?.avatar_url }}
              size="xl"
            />
            <div>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '2px' }}>Tên của bạn là gì?</h2>
              <p className="muted" style={{ fontSize: '0.82rem' }}>
                Tên này sẽ hiển thị trên cặp song ca khi bạn đi hát cùng hội bạn.
              </p>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="display-name">
              TÊN HIỂN THỊ TRONG NHÓM
            </label>
            <input
              id="display-name"
              className="input-text"
              value={name}
              maxLength={80}
              placeholder="VD: Thái Gin, Huy Bùi, Linh..."
              required
              onChange={event => setName(event.target.value)}
              autoFocus
            />
          </div>

          {localError && <div className="error-banner">{localError}</div>}

          <button
            className="btn-primary"
            disabled={isBusy || !name.trim()}
            style={{ width: '100%', marginTop: '8px' }}
          >
            <span>{isBusy ? 'Đang lưu…' : 'Tiếp tục bước 2'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    );
  }

  // Step 2: Group Creation or Join
  if (!groups.length) {
    const submitGroup = (event: FormEvent) => {
      event.preventDefault();
      void perform(() => (mode === 'create' ? createGroup(groupName) : joinGroup(joinCode)));
    };

    return (
      <div className="auth-screen">
        <div className="auth-atmosphere-glow" />

        <form className="auth-card" onSubmit={submitGroup}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="eyebrow">BƯỚC 2 / 2</span>
            <span className="badge badge-purple">GIA NHẬP NHÓM</span>
          </div>

          <div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '4px' }}>
              {mode === 'create' ? 'Tạo hội bạn của bạn' : 'Tham gia nhóm bạn có sẵn'}
            </h2>
            <p className="muted" style={{ fontSize: '0.82rem' }}>
              GinKaraoke vận hành theo từng nhóm bạn để tự động khớp playlist.
            </p>
          </div>

          {/* Segmented Switcher */}
          <div className="segmented">
            <button
              type="button"
              className={mode === 'create' ? 'active' : ''}
              onClick={() => setMode('create')}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Plus size={16} /> Tạo nhóm mới
              </span>
            </button>
            <button
              type="button"
              className={mode === 'join' ? 'active' : ''}
              onClick={() => setMode('join')}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Users size={16} /> Nhập mã nhóm
              </span>
            </button>
          </div>

          {mode === 'create' ? (
            <div>
              <label className="field-label" htmlFor="group-name">
                TÊN NHÓM BẠN
              </label>
              <input
                id="group-name"
                className="input-text"
                value={groupName}
                maxLength={100}
                required
                placeholder="VD: Hội mê karaoke, Team Gin Quậy..."
                onChange={event => setGroupName(event.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label className="field-label" htmlFor="join-code">
                MÃ THAM GIA DO BẠN BÈ CHIA SẺ
              </label>
              <input
                id="join-code"
                className="input-text code-input"
                value={joinCode}
                minLength={8}
                required
                placeholder="VD: GIN-KARAOKE-2026"
                onChange={event => setJoinCode(event.target.value.toUpperCase())}
                autoFocus
              />
            </div>
          )}

          {localError && <div className="error-banner">{localError}</div>}

          <button
            className="btn-primary"
            disabled={isBusy || (mode === 'create' ? !groupName.trim() : joinCode.trim().length < 8)}
            style={{ width: '100%', marginTop: '6px' }}
          >
            <span>{isBusy ? 'Đang xử lý…' : mode === 'create' ? 'Tạo nhóm ngay' : 'Tham gia nhóm'}</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            className="text-button"
            onClick={() => void perform(signOut)}
            style={{ marginTop: '4px' }}
          >
            Đăng xuất tài khoản
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <LoaderCircle className="spin" size={32} color="var(--neon-cyan)" />
      <p style={{ color: 'var(--text-secondary)' }}>Đang chuẩn bị dữ liệu nhóm…</p>
    </div>
  );
}
