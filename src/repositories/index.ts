import { isSupabaseConfigured } from '../services/supabase';
import {
  IGroupRepository,
  IMemberRepository,
  ISongRepository,
  IMemberSongRepository,
  ISessionRepository
} from './types';
import {
  localGroupRepo,
  localMemberRepo,
  localSongRepo,
  localMemberSongRepo,
  localSessionRepo
} from './localRepo';
import {
  supabaseGroupRepo,
  supabaseMemberRepo,
  supabaseSongRepo,
  supabaseMemberSongRepo,
  supabaseSessionRepo
} from './supabaseRepo';

export const isUsingCloud = (): boolean => {
  return isSupabaseConfigured();
};

export const GroupRepo: IGroupRepository = {
  async getGroupByJoinCode(code) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseGroupRepo.getGroupByJoinCode(code);
      } catch (err) {
        console.warn('Supabase getGroupByJoinCode failed, trying local fallback:', err);
      }
    }
    return localGroupRepo.getGroupByJoinCode(code);
  },

  async createGroup(name, joinCode) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseGroupRepo.createGroup(name, joinCode);
    }
    return localGroupRepo.createGroup(name, joinCode);
  },

  async getGroupById(id) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseGroupRepo.getGroupById(id);
      } catch (err) {
        console.warn('Supabase getGroupById failed, trying local fallback:', err);
      }
    }
    return localGroupRepo.getGroupById(id);
  },

  async exportBackup(groupId) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseGroupRepo.exportBackup(groupId);
    }
    return localGroupRepo.exportBackup(groupId);
  },

  async importBackup(backup) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseGroupRepo.importBackup(backup);
    }
    return localGroupRepo.importBackup(backup);
  },
};

export const MemberRepo: IMemberRepository = {
  async getMembersByGroup(groupId) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseMemberRepo.getMembersByGroup(groupId);
      } catch (err) {
        console.warn('Supabase getMembersByGroup failed, fallback to local:', err);
      }
    }
    return localMemberRepo.getMembersByGroup(groupId);
  },

  async createMember(groupId, displayName, avatar) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseMemberRepo.createMember(groupId, displayName, avatar);
    }
    return localMemberRepo.createMember(groupId, displayName, avatar);
  },

  async updateMember(memberId, displayName, avatar) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseMemberRepo.updateMember(memberId, displayName, avatar);
    }
    return localMemberRepo.updateMember(memberId, displayName, avatar);
  },

  async deleteMember(memberId) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseMemberRepo.deleteMember(memberId);
    }
    return localMemberRepo.deleteMember(memberId);
  },
};

export const SongRepo: ISongRepository = {
  async searchSongs(query) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseSongRepo.searchSongs(query);
      } catch (err) {
        console.warn('Supabase searchSongs failed, fallback to local:', err);
      }
    }
    return localSongRepo.searchSongs(query);
  },

  async findOrCreateSong(title, artist) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseSongRepo.findOrCreateSong(title, artist);
    }
    return localSongRepo.findOrCreateSong(title, artist);
  },

  async getAllSongs() {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseSongRepo.getAllSongs();
      } catch (err) {
        console.warn('Supabase getAllSongs failed, fallback to local:', err);
      }
    }
    return localSongRepo.getAllSongs();
  },
};

export const MemberSongRepo: IMemberSongRepository = {
  async getMemberSongs(memberId) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseMemberSongRepo.getMemberSongs(memberId);
      } catch (err) {
        console.warn('Supabase getMemberSongs failed, fallback to local:', err);
      }
    }
    return localMemberSongRepo.getMemberSongs(memberId);
  },

  async getAllMemberSongsForGroup(groupId) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseMemberSongRepo.getAllMemberSongsForGroup(groupId);
      } catch (err) {
        console.warn('Supabase getAllMemberSongsForGroup failed, fallback to local:', err);
      }
    }
    return localMemberSongRepo.getAllMemberSongsForGroup(groupId);
  },

  async addSongToMember(memberId, songId, favorite, priority) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseMemberSongRepo.addSongToMember(memberId, songId, favorite, priority);
    }
    return localMemberSongRepo.addSongToMember(memberId, songId, favorite, priority);
  },

  async updateMemberSong(id, updates) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseMemberSongRepo.updateMemberSong(id, updates);
    }
    return localMemberSongRepo.updateMemberSong(id, updates);
  },

  async removeMemberSong(memberSongId) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseMemberSongRepo.removeMemberSong(memberSongId);
    }
    return localMemberSongRepo.removeMemberSong(memberSongId);
  },
};

export const SessionRepo: ISessionRepository = {
  async getSessionsByGroup(groupId) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseSessionRepo.getSessionsByGroup(groupId);
      } catch (err) {
        console.warn('Supabase getSessionsByGroup failed, fallback to local:', err);
      }
    }
    return localSessionRepo.getSessionsByGroup(groupId);
  },

  async getActiveSession(groupId) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseSessionRepo.getActiveSession(groupId);
      } catch (err) {
        console.warn('Supabase getActiveSession failed, fallback to local:', err);
      }
    }
    return localSessionRepo.getActiveSession(groupId);
  },

  async createSession(groupId, title, participantIds, initialSongs) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseSessionRepo.createSession(groupId, title, participantIds, initialSongs);
    }
    return localSessionRepo.createSession(groupId, title, participantIds, initialSongs);
  },

  async getSessionDetails(sessionId) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseSessionRepo.getSessionDetails(sessionId);
      } catch (err) {
        console.warn('Supabase getSessionDetails failed, fallback to local:', err);
      }
    }
    return localSessionRepo.getSessionDetails(sessionId);
  },

  async toggleSongSung(sessionSongId, sung) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseSessionRepo.toggleSongSung(sessionSongId, sung);
    }
    return localSessionRepo.toggleSongSung(sessionSongId, sung);
  },

  async updateSessionSongOrder(sessionSongId, priorityOrder) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseSessionRepo.updateSessionSongOrder(sessionSongId, priorityOrder);
    }
    return localSessionRepo.updateSessionSongOrder(sessionSongId, priorityOrder);
  },

  async completeSession(sessionId) {
    if (isUsingCloud() && navigator.onLine) {
      return supabaseSessionRepo.completeSession(sessionId);
    }
    return localSessionRepo.completeSession(sessionId);
  },

  async getRecentlySungSongIds(groupId, limitSessions) {
    if (isUsingCloud() && navigator.onLine) {
      try {
        return await supabaseSessionRepo.getRecentlySungSongIds(groupId, limitSessions);
      } catch (err) {
        console.warn('Supabase getRecentlySungSongIds failed, fallback to local:', err);
      }
    }
    return localSessionRepo.getRecentlySungSongIds(groupId, limitSessions);
  },
};
