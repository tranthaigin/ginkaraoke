import {
  Group,
  Member,
  Song,
  MemberSong,
  KaraokeSession,
  SessionMember,
  SessionSong,
  Priority
} from '../types';
import {
  BackupData,
  IGroupRepository,
  IMemberRepository,
  ISongRepository,
  IMemberSongRepository,
  ISessionRepository
} from './types';
import { normalizeSongTitle, generateSongKey, cleanDisplayString } from '../utils/normalize';

const STORAGE_KEY = 'ginkaraoke_local_state_v1';

interface LocalState {
  groups: Group[];
  members: Member[];
  songs: Song[];
  memberSongs: MemberSong[];
  sessions: KaraokeSession[];
  sessionMembers: SessionMember[];
  sessionSongs: SessionSong[];
}

const DEFAULT_DEMO_STATE: LocalState = {
  groups: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'QT Karaoke Team',
      join_code: 'QT-KARAOKE',
      created_at: new Date().toISOString(),
    },
  ],
  members: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      group_id: 'a0000000-0000-0000-0000-000000000001',
      display_name: 'Qt',
      avatar: '😎',
      created_at: new Date().toISOString(),
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      group_id: 'a0000000-0000-0000-0000-000000000001',
      display_name: 'Huy',
      avatar: '🤠',
      created_at: new Date().toISOString(),
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      group_id: 'a0000000-0000-0000-0000-000000000001',
      display_name: 'Khang',
      avatar: '🥳',
      created_at: new Date().toISOString(),
    },
  ],
  songs: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Nơi này có anh',
      artist: 'Sơn Tùng M-TP',
      normalized_title: 'noi nay co anh',
      created_at: new Date().toISOString(),
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      title: 'Bạc phận',
      artist: 'Jack x K-ICM',
      normalized_title: 'bac phan',
      created_at: new Date().toISOString(),
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      title: 'Sóng gió',
      artist: 'Jack x K-ICM',
      normalized_title: 'song gio',
      created_at: new Date().toISOString(),
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      title: 'Chúng ta của tương lai',
      artist: 'Sơn Tùng M-TP',
      normalized_title: 'chung ta cua tuong lai',
      created_at: new Date().toISOString(),
    },
  ],
  memberSongs: [
    // Qt: Nơi này có anh (HIGH, fav), Bạc phận (WANT), Sóng gió (NORMAL)
    {
      id: 'ms-1',
      member_id: 'b0000000-0000-0000-0000-000000000001',
      song_id: 'c0000000-0000-0000-0000-000000000001',
      favorite: true,
      priority: 'HIGH',
    },
    {
      id: 'ms-2',
      member_id: 'b0000000-0000-0000-0000-000000000001',
      song_id: 'c0000000-0000-0000-0000-000000000002',
      favorite: false,
      priority: 'WANT_TO_SING',
    },
    {
      id: 'ms-3',
      member_id: 'b0000000-0000-0000-0000-000000000001',
      song_id: 'c0000000-0000-0000-0000-000000000003',
      favorite: false,
      priority: 'NORMAL',
    },
    // Huy: Nơi này có anh (NORMAL), Bạc phận (HIGH, fav), Chúng ta của tương lai (WANT)
    {
      id: 'ms-4',
      member_id: 'b0000000-0000-0000-0000-000000000002',
      song_id: 'c0000000-0000-0000-0000-000000000001',
      favorite: false,
      priority: 'NORMAL',
    },
    {
      id: 'ms-5',
      member_id: 'b0000000-0000-0000-0000-000000000002',
      song_id: 'c0000000-0000-0000-0000-000000000002',
      favorite: true,
      priority: 'HIGH',
    },
    {
      id: 'ms-6',
      member_id: 'b0000000-0000-0000-0000-000000000002',
      song_id: 'c0000000-0000-0000-0000-000000000004',
      favorite: false,
      priority: 'WANT_TO_SING',
    },
    // Khang: Nơi này có anh (NORMAL), Sóng gió (HIGH, fav), Chúng ta của tương lai (NORMAL)
    {
      id: 'ms-7',
      member_id: 'b0000000-0000-0000-0000-000000000003',
      song_id: 'c0000000-0000-0000-0000-000000000001',
      favorite: false,
      priority: 'NORMAL',
    },
    {
      id: 'ms-8',
      member_id: 'b0000000-0000-0000-0000-000000000003',
      song_id: 'c0000000-0000-0000-0000-000000000003',
      favorite: true,
      priority: 'HIGH',
    },
    {
      id: 'ms-9',
      member_id: 'b0000000-0000-0000-0000-000000000003',
      song_id: 'c0000000-0000-0000-0000-000000000004',
      favorite: false,
      priority: 'NORMAL',
    },
  ],
  sessions: [],
  sessionMembers: [],
  sessionSongs: [],
};

function loadState(): LocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveState(DEFAULT_DEMO_STATE);
      return DEFAULT_DEMO_STATE;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_STATE;
  }
}

function saveState(state: LocalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export const localGroupRepo: IGroupRepository = {
  async getGroupByJoinCode(code: string): Promise<Group | null> {
    const state = loadState();
    const cleanCode = code.trim().toUpperCase();
    return state.groups.find(g => g.join_code.toUpperCase() === cleanCode) || null;
  },

  async createGroup(name: string, joinCode: string): Promise<Group> {
    const state = loadState();
    const cleanCode = joinCode.trim().toUpperCase();
    const existing = state.groups.find(g => g.join_code.toUpperCase() === cleanCode);
    if (existing) {
      throw new Error(`Mã nhóm "${joinCode}" đã được sử dụng! Vui lòng chọn mã khác.`);
    }

    const newGroup: Group = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'grp-' + Date.now(),
      name: cleanDisplayString(name),
      join_code: cleanCode,
      created_at: new Date().toISOString(),
    };

    state.groups.push(newGroup);
    saveState(state);
    return newGroup;
  },

  async getGroupById(id: string): Promise<Group | null> {
    const state = loadState();
    return state.groups.find(g => g.id === id) || null;
  },

  async exportBackup(groupId: string): Promise<BackupData> {
    const state = loadState();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) throw new Error('Không tìm thấy thông tin nhóm!');

    const members = state.members.filter(m => m.group_id === groupId);
    const memberIds = new Set(members.map(m => m.id));
    const memberSongs = state.memberSongs.filter(ms => memberIds.has(ms.member_id));
    const songIds = new Set(memberSongs.map(ms => ms.song_id));
    const songs = state.songs.filter(s => songIds.has(s.id));

    const sessions = state.sessions.filter(s => s.group_id === groupId);
    const sessionIds = new Set(sessions.map(s => s.id));
    const sessionMembers = state.sessionMembers.filter(sm => sessionIds.has(sm.session_id));
    const sessionSongs = state.sessionSongs.filter(ss => sessionIds.has(ss.session_id));

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      group,
      members,
      songs,
      memberSongs,
      sessions,
      sessionMembers,
      sessionSongs,
    };
  },

  async importBackup(backup: BackupData): Promise<{ success: boolean; message: string }> {
    if (!backup || !backup.group || !Array.isArray(backup.members) || !Array.isArray(backup.songs)) {
      throw new Error('Dữ liệu JSON không hợp lệ hoặc thiếu cấu trúc bắt buộc!');
    }

    const state = loadState();
    // Overwrite / merge group
    state.groups = state.groups.filter(g => g.id !== backup.group.id);
    state.groups.push(backup.group);

    // Merge members
    const incomingMemberIds = new Set(backup.members.map(m => m.id));
    state.members = state.members.filter(m => !incomingMemberIds.has(m.id)).concat(backup.members);

    // Merge songs
    const existingSongKeys = new Set(state.songs.map(s => generateSongKey(s.title, s.artist)));
    for (const song of backup.songs) {
      const key = generateSongKey(song.title, song.artist);
      if (!existingSongKeys.has(key)) {
        state.songs.push(song);
        existingSongKeys.add(key);
      }
    }

    // Merge member songs
    const incomingMsIds = new Set(backup.memberSongs.map(ms => ms.id));
    state.memberSongs = state.memberSongs.filter(ms => !incomingMsIds.has(ms.id)).concat(backup.memberSongs);

    // Merge sessions if present
    if (backup.sessions) {
      const incSessIds = new Set(backup.sessions.map(s => s.id));
      state.sessions = state.sessions.filter(s => !incSessIds.has(s.id)).concat(backup.sessions);
    }
    if (backup.sessionMembers) {
      state.sessionMembers = state.sessionMembers.concat(backup.sessionMembers);
    }
    if (backup.sessionSongs) {
      state.sessionSongs = state.sessionSongs.concat(backup.sessionSongs);
    }

    saveState(state);
    return { success: true, message: `Nhập dữ liệu thành công cho nhóm "${backup.group.name}"!` };
  },
};

export const localMemberRepo: IMemberRepository = {
  async getMembersByGroup(groupId: string): Promise<Member[]> {
    const state = loadState();
    return state.members.filter(m => m.group_id === groupId);
  },

  async createMember(groupId: string, displayName: string, avatar: string): Promise<Member> {
    const state = loadState();
    const newMember: Member = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'mem-' + Date.now(),
      group_id: groupId,
      display_name: cleanDisplayString(displayName),
      avatar: avatar || '🎤',
      created_at: new Date().toISOString(),
    };
    state.members.push(newMember);
    saveState(state);
    return newMember;
  },

  async updateMember(memberId: string, displayName: string, avatar: string): Promise<Member> {
    const state = loadState();
    const member = state.members.find(m => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy thành viên!');
    member.display_name = cleanDisplayString(displayName);
    member.avatar = avatar;
    saveState(state);
    return member;
  },

  async deleteMember(memberId: string): Promise<void> {
    const state = loadState();
    state.members = state.members.filter(m => m.id !== memberId);
    state.memberSongs = state.memberSongs.filter(ms => ms.member_id !== memberId);
    state.sessionMembers = state.sessionMembers.filter(sm => sm.member_id !== memberId);
    saveState(state);
  },
};

export const localSongRepo: ISongRepository = {
  async searchSongs(query: string): Promise<Song[]> {
    const state = loadState();
    const norm = normalizeSongTitle(query);
    if (!norm) return state.songs.slice(0, 50);
    return state.songs.filter(s => s.normalized_title.includes(norm) || s.artist.toLowerCase().includes(query.toLowerCase()));
  },

  async findOrCreateSong(title: string, artist: string = ''): Promise<Song> {
    const state = loadState();
    const cleanTitle = cleanDisplayString(title);
    const cleanArtist = cleanDisplayString(artist);
    const normTitle = normalizeSongTitle(cleanTitle);

    let existing = state.songs.find(
      s => s.normalized_title === normTitle && normalizeSongTitle(s.artist) === normalizeSongTitle(cleanArtist)
    );

    if (existing) return existing;

    const newSong: Song = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'song-' + Date.now(),
      title: cleanTitle,
      artist: cleanArtist,
      normalized_title: normTitle,
      created_at: new Date().toISOString(),
    };

    state.songs.push(newSong);
    saveState(state);
    return newSong;
  },

  async getAllSongs(): Promise<Song[]> {
    const state = loadState();
    return state.songs;
  },
};

export const localMemberSongRepo: IMemberSongRepository = {
  async getMemberSongs(memberId: string): Promise<MemberSong[]> {
    const state = loadState();
    const songsMap = new Map(state.songs.map(s => [s.id, s]));
    return state.memberSongs
      .filter(ms => ms.member_id === memberId)
      .map(ms => ({
        ...ms,
        song: songsMap.get(ms.song_id),
      }));
  },

  async getAllMemberSongsForGroup(groupId: string): Promise<MemberSong[]> {
    const state = loadState();
    const memberIds = new Set(state.members.filter(m => m.group_id === groupId).map(m => m.id));
    const songsMap = new Map(state.songs.map(s => [s.id, s]));
    return state.memberSongs
      .filter(ms => memberIds.has(ms.member_id))
      .map(ms => ({
        ...ms,
        song: songsMap.get(ms.song_id),
      }));
  },

  async addSongToMember(memberId: string, songId: string, favorite = false, priority: Priority = 'NORMAL'): Promise<MemberSong> {
    const state = loadState();
    const existing = state.memberSongs.find(ms => ms.member_id === memberId && ms.song_id === songId);
    if (existing) {
      existing.favorite = favorite;
      existing.priority = priority;
      saveState(state);
      return existing;
    }

    const newEntry: MemberSong = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'ms-' + Date.now(),
      member_id: memberId,
      song_id: songId,
      favorite,
      priority,
      created_at: new Date().toISOString(),
      song: state.songs.find(s => s.id === songId),
    };

    state.memberSongs.push(newEntry);
    saveState(state);
    return newEntry;
  },

  async updateMemberSong(id: string, updates: { favorite?: boolean; priority?: Priority }): Promise<MemberSong> {
    const state = loadState();
    const entry = state.memberSongs.find(ms => ms.id === id);
    if (!entry) throw new Error('Không tìm thấy bài hát của thành viên!');

    if (updates.favorite !== undefined) entry.favorite = updates.favorite;
    if (updates.priority !== undefined) entry.priority = updates.priority;

    saveState(state);
    return entry;
  },

  async removeMemberSong(memberSongId: string): Promise<void> {
    const state = loadState();
    state.memberSongs = state.memberSongs.filter(ms => ms.id !== memberSongId);
    saveState(state);
  },
};

export const localSessionRepo: ISessionRepository = {
  async getSessionsByGroup(groupId: string): Promise<KaraokeSession[]> {
    const state = loadState();
    return state.sessions
      .filter(s => s.group_id === groupId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },

  async getActiveSession(groupId: string): Promise<KaraokeSession | null> {
    const state = loadState();
    return state.sessions.find(s => s.group_id === groupId && s.status === 'active') || null;
  },

  async createSession(
    groupId: string,
    title: string,
    participantIds: string[],
    initialSongs: { songId: string; score: number; priorityOrder: number }[]
  ): Promise<KaraokeSession> {
    const state = loadState();
    // Mark any existing active session as completed
    state.sessions.forEach(s => {
      if (s.group_id === groupId && s.status === 'active') s.status = 'completed';
    });

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess-' + Date.now();
    const newSession: KaraokeSession = {
      id: sessionId,
      group_id: groupId,
      title: cleanDisplayString(title) || `Karaoke ${new Date().toLocaleDateString('vi-VN')}`,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    state.sessions.push(newSession);

    for (const pid of participantIds) {
      state.sessionMembers.push({
        id: crypto.randomUUID ? crypto.randomUUID() : 'sm-' + Math.random(),
        session_id: sessionId,
        member_id: pid,
      });
    }

    for (const isong of initialSongs) {
      state.sessionSongs.push({
        id: crypto.randomUUID ? crypto.randomUUID() : 'ss-' + Math.random(),
        session_id: sessionId,
        song_id: isong.songId,
        sung: false,
        sung_at: null,
        priority_order: isong.priorityOrder,
        score: isong.score,
      });
    }

    saveState(state);
    return newSession;
  },

  async getSessionDetails(sessionId: string): Promise<{ session: KaraokeSession; members: Member[]; songs: SessionSong[] } | null> {
    const state = loadState();
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    const pIds = state.sessionMembers.filter(sm => sm.session_id === sessionId).map(sm => sm.member_id);
    const members = state.members.filter(m => pIds.includes(m.id));

    const songsMap = new Map(state.songs.map(s => [s.id, s]));
    const songs = state.sessionSongs
      .filter(ss => ss.session_id === sessionId)
      .map(ss => ({
        ...ss,
        song: songsMap.get(ss.song_id),
      }))
      .sort((a, b) => a.priority_order - b.priority_order);

    return { session, members, songs };
  },

  async toggleSongSung(sessionSongId: string, sung: boolean): Promise<void> {
    const state = loadState();
    const song = state.sessionSongs.find(ss => ss.id === sessionSongId);
    if (song) {
      song.sung = sung;
      song.sung_at = sung ? new Date().toISOString() : null;
      saveState(state);
    }
  },

  async updateSessionSongOrder(sessionSongId: string, priorityOrder: number): Promise<void> {
    const state = loadState();
    const song = state.sessionSongs.find(ss => ss.id === sessionSongId);
    if (song) {
      song.priority_order = priorityOrder;
      saveState(state);
    }
  },

  async completeSession(sessionId: string): Promise<void> {
    const state = loadState();
    const session = state.sessions.find(s => s.id === sessionId);
    if (session) {
      session.status = 'completed';
      saveState(state);
    }
  },

  async getRecentlySungSongIds(groupId: string, limitSessions = 2): Promise<string[]> {
    const state = loadState();
    const groupSessions = state.sessions
      .filter(s => s.group_id === groupId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, limitSessions);

    const recentSessionIds = new Set(groupSessions.map(s => s.id));
    const sungSongIds = state.sessionSongs
      .filter(ss => recentSessionIds.has(ss.session_id) && ss.sung)
      .map(ss => ss.song_id);

    return Array.from(new Set(sungSongIds));
  },
};
