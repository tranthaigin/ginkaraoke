import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MemberRepo, GroupRepo } from '../repositories';
import { Member } from '../types';
import {
  Copy,
  Check,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Database,
  X
} from 'lucide-react';

const AVATAR_OPTIONS = ['🎤', '😎', '🤠', '🥳', '😇', '🎸', '👑', '🔥', '🐱', '🦊', '🐼', '🦄'];

export const GroupPage: React.FC = () => {
  const {
    currentGroup,
    members,
    currentMember,
    setCurrentMember,
    joinGroupByCode,
    createGroup,
    createMember,
    reloadMembers,
    isCloudConnected,
    showToast
  } = useApp();

  const [copied, setCopied] = useState(false);

  // Switch / Join group state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create group state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  // Add / Edit member state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberNameInput, setMemberNameInput] = useState('');
  const [memberAvatarInput, setMemberAvatarInput] = useState('🎤');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyCode = () => {
    if (!currentGroup) return;
    navigator.clipboard.writeText(currentGroup.join_code);
    setCopied(true);
    showToast(`Đã sao chép mã nhóm: ${currentGroup.join_code}`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  // Join group handler
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const success = await joinGroupByCode(joinCodeInput.trim());
    if (success) {
      setShowJoinModal(false);
      setJoinCodeInput('');
    }
  };

  // Create group handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGroup(newGroupName.trim(), newGroupCode.trim());
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupCode('');
    } catch (err: any) {
      showToast(err.message || 'Lỗi tạo nhóm', 'error');
    }
  };

  // Open add member modal
  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberNameInput('');
    setMemberAvatarInput('🎤');
    setShowMemberModal(true);
  };

  // Open edit member modal
  const handleOpenEditMember = (m: Member) => {
    setEditingMember(m);
    setMemberNameInput(m.display_name);
    setMemberAvatarInput(m.avatar);
    setShowMemberModal(true);
  };

  // Save member handler
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberNameInput.trim()) {
      showToast('Vui lòng nhập tên thành viên!', 'warning');
      return;
    }

    try {
      if (editingMember) {
        // Edit existing
        await MemberRepo.updateMember(editingMember.id, memberNameInput.trim(), memberAvatarInput);
        showToast('Đã cập nhật thông tin thành viên!', 'success');
        await reloadMembers();
      } else {
        // Create new
        await createMember(memberNameInput.trim(), memberAvatarInput);
      }
      setShowMemberModal(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu thông tin thành viên', 'error');
    }
  };

  // Delete member handler
  const handleDeleteMember = async (m: Member) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thành viên "${m.display_name}"?`)) {
      return;
    }
    try {
      await MemberRepo.deleteMember(m.id);
      showToast(`Đã xóa thành viên "${m.display_name}"`, 'info');
      await reloadMembers();
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa thành viên', 'error');
    }
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    if (!currentGroup) return;
    try {
      const backup = await GroupRepo.exportBackup(currentGroup.id);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ginkaraoke_backup_${currentGroup.join_code}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Đã xuất file sao lưu JSON thành công!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xuất file backup', 'error');
    }
  };

  // Import JSON Backup
  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);

        // Schema validation
        if (!backupData || typeof backupData !== 'object') {
          throw new Error('Định dạng JSON không hợp lệ!');
        }
        if (!backupData.group || !backupData.group.name || !backupData.group.join_code) {
          throw new Error('File backup thiếu thông tin nhóm (group)!');
        }
        if (!Array.isArray(backupData.members) || !Array.isArray(backupData.songs)) {
          throw new Error('File backup thiếu mảng members hoặc songs!');
        }

        if (
          !window.confirm(
            `Xác nhận khôi phục dữ liệu cho nhóm "${backupData.group.name}"?\n(Gồm ${backupData.members.length} thành viên và ${backupData.songs.length} bài hát)`
          )
        ) {
          return;
        }

        const result = await GroupRepo.importBackup(backupData);
        showToast(result.message, 'success');
        await reloadMembers();
      } catch (err: any) {
        showToast(err.message || 'Lỗi khi đọc file backup', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Quản lý Nhóm</span>
          <span style={{ fontSize: '1.2rem' }}>👥</span>
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cài đặt nhóm, quản lý thành viên và sao lưu dữ liệu
        </p>
      </div>

      {/* Group Card */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              NHÓM HIỆN TẠI
            </span>
            <h2 style={{ fontSize: '1.3rem', color: '#ffffff', marginTop: '2px' }}>
              {currentGroup ? currentGroup.name : 'Chưa có nhóm'}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', minHeight: '34px' }}
            >
              Vào nhóm khác
            </button>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', minHeight: '34px' }}
            >
              + Tạo nhóm mới
            </button>
          </div>
        </div>

        {/* Join Code Box */}
        {currentGroup && (
          <div
            onClick={handleCopyCode}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px dashed var(--neon-cyan)',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>MÃ VÀO NHÓM (JOIN CODE)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '0.05em' }}>
                {currentGroup.join_code}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neon-cyan)', fontSize: '0.8rem', fontWeight: 600 }}>
              {copied ? (
                <>
                  <Check size={16} color="#34d399" />
                  <span style={{ color: '#34d399' }}>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Sao chép mã</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Danh sách thành viên ({members.length})</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mỗi bạn có thể lưu bài hát của riêng mình</p>
          </div>
          <button
            onClick={handleOpenAddMember}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '36px' }}
          >
            <Plus size={15} />
            <span>Thêm bạn</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {members.map(member => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: member.id === currentMember?.id ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: member.id === currentMember?.id ? '1px solid var(--neon-purple)' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>{member.avatar || '🎤'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{member.display_name}</span>
                    {member.id === currentMember?.id && (
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Bạn</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {member.id !== currentMember?.id && (
                  <button
                    onClick={() => {
                      setCurrentMember(member);
                      showToast(`Đã chuyển sang bạn: ${member.display_name}`, 'info');
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Chọn là tôi
                  </button>
                )}

                <button
                  onClick={() => handleOpenEditMember(member)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Sửa tên / avatar"
                >
                  <Edit2 size={15} />
                </button>

                <button
                  onClick={() => handleDeleteMember(member)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fb7185',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Xóa thành viên"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backup & Restore Section */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '4px' }}>Sao lưu & Khôi phục dữ liệu 💾</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Tải file JSON dự phòng hoặc khôi phục dữ liệu an toàn
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={handleExportBackup}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '10px' }}
          >
            <Download size={16} />
            <span>Xuất JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '10px' }}
          >
            <Upload size={16} />
            <span>Nhập JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFileSelected}
          />
        </div>
      </div>

      {/* Cloud & Connection Status */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Database size={16} color="var(--neon-purple)" />
          <h4 style={{ fontSize: '0.92rem' }}>Trạng thái kết nối Backend</h4>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {isCloudConnected ? (
            <span style={{ color: '#34d399', fontWeight: 600 }}>
              ✅ Đang kết nối Supabase Cloud PostgreSQL với Row Level Security (RLS) & Realtime.
            </span>
          ) : (
            <span>
              ℹ️ Đang hoạt động ở chế độ Local Mock (LocalStorage). Dữ liệu mẫu (Qt, Huy, Khang) sẵn sàng để trải nghiệm ngay. Điền <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> vào <code>.env</code> để đồng bộ thời gian thực giữa nhiều điện thoại.
            </span>
          )}
        </p>
      </div>

      {/* MODAL: JOIN GROUP */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Tham gia nhóm khác 🔑</h3>
              <button onClick={() => setShowJoinModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleJoinGroup}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                NHẬP MÃ NHÓM (JOIN CODE)
              </label>
              <input
                type="text"
                className="input-text"
                placeholder="VD: QT-KARAOKE"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
              />
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                Tham gia nhóm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE GROUP */}
      {showCreateGroupModal && (
        <div className="modal-overlay" onClick={() => setShowCreateGroupModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Tạo nhóm mới 👥</h3>
              <button onClick={() => setShowCreateGroupModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  TÊN NHÓM *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="VD: Hội Ca Sĩ Xóm, Bạn Thân..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  MÃ VÀO NHÓM (JOIN CODE) *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="VD: CA-SI-XOM, TEAM-QUAN-8..."
                  value={newGroupCode}
                  onChange={e => setNewGroupCode(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Tạo nhóm ngay
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MEMBER */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>{editingMember ? 'Sửa thông tin bạn' : 'Thêm bạn mới 🎤'}</h3>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveMember}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  TÊN HIỂN THỊ *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="VD: Qt, Huy, Nam, Khang..."
                  value={memberNameInput}
                  onChange={e => setMemberNameInput(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  CHỌN AVATAR
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMemberAvatarInput(emoji)}
                      style={{
                        padding: '8px',
                        fontSize: '1.4rem',
                        borderRadius: 'var(--radius-md)',
                        background: memberAvatarInput === emoji ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                        border: memberAvatarInput === emoji ? '2px solid var(--neon-purple)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                {editingMember ? 'Cập nhật' : 'Thêm vào nhóm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
