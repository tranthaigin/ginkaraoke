import {
  profileRepository,
  groupRepository,
  songRepository,
  memberSongRepository,
  sessionRepository,
} from './supabaseRepo';
export const ProfileRepo = profileRepository;
export const GroupRepo = groupRepository;
export const SongRepo = songRepository;
export const MemberSongRepo = memberSongRepository;
export const SessionRepo = sessionRepository;
