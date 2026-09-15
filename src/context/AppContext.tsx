import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Group, Member } from '../types';
import { GroupRepo, MemberRepo, isUsingCloud } from '../repositories';
import { supabase } from '../services/supabase';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AppContextType {
  currentGroup: Group | null;
  currentMember: Member | null;
  members: Member[];
  isOnline: boolean;
  isCloudConnected: boolean;
  isLoading: boolean;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  setCurrentGroup: (group: Group | null) => void;
  setCurrentMember: (member: Member | null) => void;
  joinGroupByCode: (code: string) => Promise<boolean>;
  createGroup: (name: string, code: string) => Promise<Group>;
  reloadMembers: () => Promise<void>;
  createMember: (name: string, avatar: string) => Promise<Member>;
}

const AppContext = createContext<AppContextType | null>(null);

const ACTIVE_GROUP_KEY = 'ginkaraoke_active_group';
const ACTIVE_MEMBER_KEY = 'ginkaraoke_active_member';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentGroup, setCurrentGroupState] = useState<Group | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_GROUP_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentMember, setCurrentMemberState] = useState<Member | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_MEMBER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isCloudConnected = isUsingCloud();

  // Toast helper
  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Set active group and persist
  const setCurrentGroup = useCallback((group: Group | null) => {
    setCurrentGroupState(group);
    if (group) {
      localStorage.setItem(ACTIVE_GROUP_KEY, JSON.stringify(group));
    } else {
      localStorage.removeItem(ACTIVE_GROUP_KEY);
      setCurrentMemberState(null);
      localStorage.removeItem(ACTIVE_MEMBER_KEY);
    }
  }, []);

  // Set active member and persist
  const setCurrentMember = useCallback((member: Member | null) => {
    setCurrentMemberState(member);
    if (member) {
      localStorage.setItem(ACTIVE_MEMBER_KEY, JSON.stringify(member));
    } else {
      localStorage.removeItem(ACTIVE_MEMBER_KEY);
    }
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã kết nối Internet trở lại!', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Đang ở chế độ Offline (mất mạng). Sử dụng dữ liệu bộ nhớ tạm.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Load members whenever currentGroup changes
  const reloadMembers = useCallback(async () => {
    if (!currentGroup) {
      setMembers([]);
      return;
    }
    try {
      setIsLoading(true);
      const list = await MemberRepo.getMembersByGroup(currentGroup.id);
      setMembers(list);

      // Auto pick active member if none or invalid
      if (list.length > 0 && (!currentMember || !list.some(m => m.id === currentMember.id))) {
        setCurrentMember(list[0]);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách thành viên:', err);
      showToast(err.message || 'Không thể tải danh sách thành viên', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentGroup, currentMember, setCurrentMember, showToast]);

  useEffect(() => {
    reloadMembers();
  }, [currentGroup?.id]);

  // Realtime subscription setup if Supabase client is available
  useEffect(() => {
    if (!currentGroup || !supabase || !isOnline) return;

    const channel = supabase
      .channel(`group-realtime-${currentGroup.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `group_id=eq.${currentGroup.id}` },
        () => {
          reloadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGroup?.id, isOnline, reloadMembers]);

  // If no group is selected on startup, load demo group default
  useEffect(() => {
    if (!currentGroup) {
      GroupRepo.getGroupByJoinCode('QT-KARAOKE')
        .then(group => {
          if (group) {
            setCurrentGroup(group);
          }
        })
        .catch(console.error);
    }
  }, [currentGroup, setCurrentGroup]);

  const joinGroupByCode = useCallback(async (code: string): Promise<boolean> => {
    if (!code || !code.trim()) {
      showToast('Vui lòng nhập mã nhóm!', 'warning');
      return false;
    }
    try {
      setIsLoading(true);
      const group = await GroupRepo.getGroupByJoinCode(code.trim());
      if (!group) {
        showToast(`Không tìm thấy nhóm với mã "${code}". Vui lòng kiểm tra lại!`, 'error');
        return false;
      }
      setCurrentGroup(group);
      showToast(`Đã vào nhóm "${group.name}"!`, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tham gia nhóm', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentGroup, showToast]);

  const createGroup = useCallback(async (name: string, code: string): Promise<Group> => {
    if (!name.trim() || !code.trim()) {
      throw new Error('Vui lòng nhập tên nhóm và mã nhóm!');
    }
    setIsLoading(true);
    try {
      const newGroup = await GroupRepo.createGroup(name, code);
      setCurrentGroup(newGroup);
      showToast(`Tạo nhóm "${newGroup.name}" thành công!`, 'success');
      return newGroup;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentGroup, showToast]);

  const createMember = useCallback(async (name: string, avatar: string): Promise<Member> => {
    if (!currentGroup) throw new Error('Chưa chọn nhóm!');
    if (!name.trim()) throw new Error('Tên thành viên không được để trống!');

    setIsLoading(true);
    try {
      const newMem = await MemberRepo.createMember(currentGroup.id, name, avatar);
      await reloadMembers();
      setCurrentMember(newMem);
      showToast(`Đã thêm thành viên "${name}"!`, 'success');
      return newMem;
    } finally {
      setIsLoading(false);
    }
  }, [currentGroup, reloadMembers, setCurrentMember, showToast]);

  const value = useMemo(() => ({
    currentGroup,
    currentMember,
    members,
    isOnline,
    isCloudConnected,
    isLoading,
    toasts,
    showToast,
    removeToast,
    setCurrentGroup,
    setCurrentMember,
    joinGroupByCode,
    createGroup,
    reloadMembers,
    createMember,
  }), [
    currentGroup,
    currentMember,
    members,
    isOnline,
    isCloudConnected,
    isLoading,
    toasts,
    showToast,
    removeToast,
    setCurrentGroup,
    setCurrentMember,
    joinGroupByCode,
    createGroup,
    reloadMembers,
    createMember,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
