import type {
  Group,
  GroupMember,
  KaraokeSession,
  MemberSong,
  Profile,
  RecommendationBatch,
  SessionSong,
  Song,
  SongRecommendation,
} from '../types';

export interface SessionDetails {
  session: KaraokeSession;
  members: Profile[];
  songs: SessionSong[];
  batches: RecommendationBatch[];
}

export interface IProfileRepository {
  getMine(): Promise<Profile | null>;
  upsertMine(displayName: string, avatarUrl?: string | null): Promise<Profile>;
}

export interface IGroupRepository {
  listMine(): Promise<Group[]>;
  create(name: string, requestedCode?: string): Promise<Group>;
  join(code: string): Promise<Group>;
  getMembers(groupId: string): Promise<GroupMember[]>;
  removeMember(groupId: string, userId: string): Promise<void>;
}

export interface ISongRepository {
  search(query: string): Promise<Song[]>;
  findOrCreate(title: string, artist?: string): Promise<Song>;
  getAll(): Promise<Song[]>;
}

export interface IMemberSongRepository {
  getMine(): Promise<MemberSong[]>;
  getForGroup(groupId: string): Promise<MemberSong[]>;
  add(songId: string, favorite?: boolean, priority?: MemberSong['priority']): Promise<MemberSong>;
  update(id: string, updates: Pick<Partial<MemberSong>, 'favorite' | 'priority'>): Promise<MemberSong>;
  remove(id: string): Promise<void>;
}

export interface ISessionRepository {
  list(groupId: string): Promise<KaraokeSession[]>;
  getActive(groupId: string): Promise<KaraokeSession | null>;
  create(groupId: string, name: string, participantIds: string[]): Promise<KaraokeSession>;
  details(sessionId: string): Promise<SessionDetails | null>;
  addBatch(sessionId: string, recommendations: SongRecommendation[], recycleMode: boolean): Promise<void>;
  setSongState(id: string, played: boolean): Promise<void>;
  prioritize(id: string, position: number): Promise<void>;
  removeSong(id: string): Promise<void>;
  complete(id: string): Promise<void>;
  recentPlayed(groupId: string, sessionLimit?: number): Promise<string[]>;
}
