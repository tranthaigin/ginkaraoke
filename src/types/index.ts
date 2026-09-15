export type Priority = 'NORMAL' | 'WANT_TO_SING' | 'HIGH';

export interface Group {
  id: string;
  name: string;
  join_code: string;
  created_at?: string;
}

export interface Member {
  id: string;
  group_id: string;
  display_name: string;
  avatar: string;
  created_at?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  normalized_title: string;
  created_at?: string;
}

export interface MemberSong {
  id: string;
  member_id: string;
  song_id: string;
  favorite: boolean;
  priority: Priority;
  created_at?: string;
  song?: Song;
}

export interface KaraokeSession {
  id: string;
  group_id: string;
  title: string;
  status: 'active' | 'completed';
  created_at?: string;
}

export interface SessionMember {
  id: string;
  session_id: string;
  member_id: string;
  member?: Member;
}

export interface SessionSong {
  id: string;
  session_id: string;
  song_id: string;
  sung: boolean;
  sung_at?: string | null;
  priority_order: number;
  score: number;
  song?: Song;
  added_by?: string;
  members?: Member[];
}

export interface RecommendationScoreBreakdown {
  commonOverlapScore: number;
  priorityBonus: number;
  favoriteBonus: number;
  recencyPenalty: number;
  fairnessBonus: number;
}

export interface SongRecommendation {
  song: Song;
  memberIds: string[];
  members: Member[];
  matchCount: number;
  totalParticipants: number;
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  isRecentlySung: boolean;
  topPriority: Priority;
  hasFavorite: boolean;
}

export interface RecommendationConfig {
  COMMON_MEMBER_WEIGHT: number;
  FAVORITE_BONUS: number;
  HIGH_PRIORITY_BONUS: number;
  WANT_TO_SING_BONUS: number;
  RECENTLY_SUNG_PENALTY: number;
  FAIRNESS_BONUS: number;
}
