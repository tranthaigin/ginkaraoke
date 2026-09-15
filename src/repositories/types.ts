import {
  Group,
  Member,
  Song,
  MemberSong,
  Priority,
  KaraokeSession,
  SessionSong,
  SessionMember
} from '../types';

export interface BackupData {
  version: number;
  exportedAt: string;
  group: Group;
  members: Member[];
  songs: Song[];
  memberSongs: MemberSong[];
  sessions?: KaraokeSession[];
  sessionSongs?: SessionSong[];
  sessionMembers?: SessionMember[];
}

export interface IGroupRepository {
  getGroupByJoinCode(code: string): Promise<Group | null>;
  createGroup(name: string, joinCode: string): Promise<Group>;
  getGroupById(id: string): Promise<Group | null>;
  exportBackup(groupId: string): Promise<BackupData>;
  importBackup(backup: BackupData): Promise<{ success: boolean; message: string }>;
}

export interface IMemberRepository {
  getMembersByGroup(groupId: string): Promise<Member[]>;
  createMember(groupId: string, displayName: string, avatar: string): Promise<Member>;
  updateMember(memberId: string, displayName: string, avatar: string): Promise<Member>;
  deleteMember(memberId: string): Promise<void>;
}

export interface ISongRepository {
  searchSongs(query: string): Promise<Song[]>;
  findOrCreateSong(title: string, artist?: string): Promise<Song>;
  getAllSongs(): Promise<Song[]>;
}

export interface IMemberSongRepository {
  getMemberSongs(memberId: string): Promise<MemberSong[]>;
  getAllMemberSongsForGroup(groupId: string): Promise<MemberSong[]>;
  addSongToMember(memberId: string, songId: string, favorite?: boolean, priority?: Priority): Promise<MemberSong>;
  updateMemberSong(id: string, updates: { favorite?: boolean; priority?: Priority }): Promise<MemberSong>;
  removeMemberSong(memberSongId: string): Promise<void>;
}

export interface ISessionRepository {
  getSessionsByGroup(groupId: string): Promise<KaraokeSession[]>;
  getActiveSession(groupId: string): Promise<KaraokeSession | null>;
  createSession(groupId: string, title: string, participantIds: string[], initialSongs: { songId: string; score: number; priorityOrder: number }[]): Promise<KaraokeSession>;
  getSessionDetails(sessionId: string): Promise<{ session: KaraokeSession; members: Member[]; songs: SessionSong[] } | null>;
  toggleSongSung(sessionSongId: string, sung: boolean): Promise<void>;
  updateSessionSongOrder(sessionSongId: string, priorityOrder: number): Promise<void>;
  completeSession(sessionId: string): Promise<void>;
  getRecentlySungSongIds(groupId: string, limitSessions?: number): Promise<string[]>;
}
