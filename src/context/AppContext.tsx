import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Group, GroupMember, Profile } from '../types';
import { GroupRepo, ProfileRepo } from '../repositories';
import { authRedirectUrl, supabase, supabaseConfigError } from '../services/supabase';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

type AuthStatus = 'loading' | 'signed_out' | 'ready' | 'config_error';

interface AppContextValue {
  authStatus: AuthStatus;
  authError: string | null;
  user: User | null;
  profile: Profile | null;
  groups: Group[];
  currentGroup: Group | null;
  members: GroupMember[];
  isOnline: boolean;
  isBusy: boolean;
  toasts: ToastMessage[];
  showToast: (text: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (name: string, avatarUrl?: string | null) => Promise<void>;
  createGroup: (name: string, code?: string) => Promise<void>;
  joinGroup: (code: string) => Promise<void>;
  selectGroup: (group: Group) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);
const GROUP_KEY = 'ginkaraoke.current-group';

export function AppProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(supabaseConfigError ? 'config_error' : 'loading');
  const [authError, setAuthError] = useState<string | null>(supabaseConfigError);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBusy, setIsBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts(items => [...items, { id, text, type }]);
    window.setTimeout(() => setToasts(items => items.filter(item => item.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(items => items.filter(item => item.id !== id)), []);

  const refreshMembers = useCallback(async () => {
    if (!currentGroup) {
      setMembers([]);
      return;
    }
    setMembers(await GroupRepo.getMembers(currentGroup.id));
  }, [currentGroup]);

  const loadAuthenticatedData = useCallback(async (session: Session) => {
    setUser(session.user);
    try {
      const [nextProfile, nextGroups] = await Promise.all([ProfileRepo.getMine(), GroupRepo.listMine()]);
      setProfile(nextProfile);
      setGroups(nextGroups);
      const savedId = localStorage.getItem(GROUP_KEY);
      const selected = nextGroups.find(group => group.id === savedId) ?? nextGroups[0] ?? null;
      setCurrentGroup(selected);
      setMembers(selected ? await GroupRepo.getMembers(selected.id) : []);
      setAuthError(null);
      setAuthStatus('ready');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Không thể tải dữ liệu tài khoản.');
      setAuthStatus('ready');
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) await loadAuthenticatedData(data.session);
  }, [loadAuthenticatedData]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const callbackParams = new URLSearchParams(window.location.search);
    const callbackError = callbackParams.get('error_description') ?? callbackParams.get('error');
    if (callbackError) setAuthError(callbackError);
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthError(error.message);
        setAuthStatus('signed_out');
      } else if (data.session) {
        void loadAuthenticatedData(data.session);
      } else {
        setAuthStatus('signed_out');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) queueMicrotask(() => void loadAuthenticatedData(session));
      else {
        setUser(null);
        setProfile(null);
        setGroups([]);
        setCurrentGroup(null);
        setMembers([]);
        setAuthStatus('signed_out');
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAuthenticatedData]);

  useEffect(() => {
    const online = () => { setIsOnline(true); showToast('Đã kết nối Internet trở lại.', 'success'); };
    const offline = () => { setIsOnline(false); showToast('Bạn đang offline. Các thao tác ghi đã được tạm khóa.', 'warning'); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [showToast]);

  useEffect(() => {
    if (!supabase || !currentGroup || !isOnline) return;
    const client = supabase;
    const channel = client.channel(`group:${currentGroup.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${currentGroup.id}` }, () => void refreshMembers())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [currentGroup, isOnline, refreshMembers]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase chưa được cấu hình.');
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl(), skipBrowserRedirect: false },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem(GROUP_KEY);
  }, []);

  const saveProfile = useCallback(async (name: string, avatarUrl?: string | null) => {
    setIsBusy(true);
    try {
      setProfile(await ProfileRepo.upsertMine(name, avatarUrl));
      showToast('Đã lưu hồ sơ.', 'success');
    } finally { setIsBusy(false); }
  }, [showToast]);

  const selectGroup = useCallback(async (group: Group) => {
    setCurrentGroup(group);
    localStorage.setItem(GROUP_KEY, group.id);
    setMembers(await GroupRepo.getMembers(group.id));
  }, []);

  const createGroup = useCallback(async (name: string, code?: string) => {
    setIsBusy(true);
    try {
      const group = await GroupRepo.create(name, code);
      setGroups(items => [...items, group]);
      await selectGroup(group);
      showToast(`Đã tạo nhóm “${group.name}”.`, 'success');
    } finally { setIsBusy(false); }
  }, [selectGroup, showToast]);

  const joinGroup = useCallback(async (code: string) => {
    setIsBusy(true);
    try {
      const group = await GroupRepo.join(code);
      setGroups(items => items.some(item => item.id === group.id) ? items : [...items, group]);
      await selectGroup(group);
      showToast(`Đã tham gia nhóm “${group.name}”.`, 'success');
    } finally { setIsBusy(false); }
  }, [selectGroup, showToast]);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentGroup) return;
    await GroupRepo.removeMember(currentGroup.id, userId);
    if (userId === user?.id) await refresh();
    else await refreshMembers();
  }, [currentGroup, refresh, refreshMembers, user]);

  const value = useMemo<AppContextValue>(() => ({
    authStatus, authError, user, profile, groups, currentGroup, members, isOnline, isBusy, toasts,
    showToast, removeToast, signInWithGoogle, signOut, saveProfile, createGroup, joinGroup,
    selectGroup, removeMember, refresh, refreshMembers,
  }), [authStatus, authError, user, profile, groups, currentGroup, members, isOnline, isBusy, toasts,
    showToast, removeToast, signInWithGoogle, signOut, saveProfile, createGroup, joinGroup,
    selectGroup, removeMember, refresh, refreshMembers]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
