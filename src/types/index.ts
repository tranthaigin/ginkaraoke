export type Priority = 'NORMAL' | 'WANT_TO_SING' | 'HIGH';
export type GroupRole = 'owner' | 'member';
export type SessionStatus = 'active' | 'completed';
export type SessionSongState = 'QUEUED' | 'PLAYED';
export type SongAvailabilityState = 'AVAILABLE' | SessionSongState;

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  join_code: string;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at?: string;
  profile?: Profile;
}

/** Lightweight participant shape consumed by the pure engine. */
export interface Member {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  normalized_title: string;
  normalized_artist: string;
  created_at?: string;
}

export interface MemberSong {
  id: string;
  user_id: string;
  song_id: string;
  favorite: boolean;
  priority: Priority;
  created_at?: string;
  updated_at?: string;
  song?: Song;
}

export interface KaraokeSession {
  id: string;
  group_id: string;
  name: string;
  status: SessionStatus;
  created_by: string;
  created_at: string;
  ended_at: string | null;
  updated_at?: string;
}

export interface SessionMember {
  session_id: string;
  user_id: string;
  joined_at?: string;
  profile?: Profile;
}

export interface RecommendationBatch {
  id: string;
  session_id: string;
  batch_number: number;
  recycle_mode: boolean;
  created_by: string;
  created_at: string;
}

export interface RecommendationScoreBreakdown {
  [key: string]: number;
  compatibility: number;
  priority: number;
  favorite: number;
  pairDiversity: number;
  fairness: number;
  rest: number;
  repeatedPairPenalty: number;
  consecutiveSingerPenalty: number;
  recentHistoryPenalty: number;
}

export interface SessionSong {
  id: string;
  session_id: string;
  batch_id: string;
  song_id: string;
  singer_1_id: string;
  singer_2_id: string;
  eligible_singer_ids: string[];
  state: SessionSongState;
  queue_position: number;
  score: number;
  score_metadata: RecommendationScoreBreakdown;
  recycle_mode: boolean;
  created_at: string;
  played_at: string | null;
  updated_at?: string;
  song?: Song;
  singer_1?: Profile;
  singer_2?: Profile;
}

export interface QueueHistoryItem {
  songId: string;
  singerIds: [string, string];
  state: SessionSongState;
}

export interface SongRecommendation {
  song: Song;
  eligibleSingerIds: string[];
  singerIds: [string, string];
  matchCount: number;
  totalParticipants: number;
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  topPriority: Priority;
  hasFavorite: boolean;
  recycleMode: boolean;
}

export interface SessionStats {
  turnsByMember: Record<string, number>;
  pairCounts: Record<string, number>;
  uniquePartnersByMember: Record<string, string[]>;
  songsQueued: number;
  songsPlayed: number;
}

export interface RecommendationConfig {
  MAX_BATCH_SIZE: number;
  COMMON_MEMBER_WEIGHT: number;
  FAVORITE_BONUS: number;
  HIGH_PRIORITY_BONUS: number;
  WANT_TO_SING_BONUS: number;
  PAIR_DIVERSITY_BONUS: number;
  FAIRNESS_WEIGHT: number;
  REST_WEIGHT: number;
  REPEATED_PAIR_PENALTY: number;
  CONSECUTIVE_SINGER_PENALTY: number;
  RECENT_HISTORY_PENALTY: number;
}
