import { supabase } from '../services/supabase';
import {
  Group,
  Member,
  Song,
  MemberSong,
  KaraokeSession,
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
import { normalizeSongTitle, cleanDisplayString } from '../utils/normalize';

function checkClient() {
  if (!supabase) {
    throw new Error('Supabase client chưa được cấu hình. Vui lòng kiểm tra .env!');
  }
  return supabase;
}

export const supabaseGroupRepo: IGroupRepository = {
  async getGroupByJoinCode(code: string): Promise<Group | null> {
    const client = checkClient();
    const cleanCode = code.trim().toUpperCase();
    const { data, error } = await client
      .from('groups')
      .select('*')
      .ilike('join_code', cleanCode)
      .maybeSingle();

    if (error) {
      console.error('Lỗi tìm nhóm theo mã:', error);
      throw new Error('Không thể kết nối đến máy chủ Supabase.');
    }
    return data;
  },

  async createGroup(name: string, joinCode: string): Promise<Group> {
    const client = checkClient();
    const cleanCode = joinCode.trim().toUpperCase();

    const { data, error } = await client
      .from('groups')
      .insert({
        name: cleanDisplayString(name),
        join_code: cleanCode,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Mã nhóm "${joinCode}" đã tồn tại! Vui lòng chọn mã khác.`);
      }
      throw new Error(`Lỗi tạo nhóm: ${error.message}`);
    }
    return data;
  },

  async getGroupById(id: string): Promise<Group | null> {
    const client = checkClient();
    const { data, error } = await client
      .from('groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async exportBackup(groupId: string): Promise<BackupData> {
    const client = checkClient();
    const group = await this.getGroupById(groupId);
    if (!group) throw new Error('Không tìm thấy thông tin nhóm!');

    const { data: members } = await client.from('members').select('*').eq('group_id', groupId);
    const memberIds = (members || []).map(m => m.id);

    const { data: memberSongs } = await client
      .from('member_songs')
      .select('*')
      .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']);

    const songIds = (memberSongs || []).map(ms => ms.song_id);
    const { data: songs } = await client
      .from('songs')
      .select('*')
      .in('id', songIds.length > 0 ? songIds : ['00000000-0000-0000-0000-000000000000']);

    const { data: sessions } = await client.from('karaoke_sessions').select('*').eq('group_id', groupId);
    const sessionIds = (sessions || []).map(s => s.id);

    const { data: sessionMembers } = await client
      .from('session_members')
      .select('*')
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

    const { data: sessionSongs } = await client
      .from('session_songs')
      .select('*')
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      group,
      members: members || [],
      songs: songs || [],
      memberSongs: memberSongs || [],
      sessions: sessions || [],
      sessionMembers: sessionMembers || [],
      sessionSongs: sessionSongs || [],
    };
  },

  async importBackup(backup: BackupData): Promise<{ success: boolean; message: string }> {
    const client = checkClient();
    if (!backup || !backup.group || !Array.isArray(backup.members) || !Array.isArray(backup.songs)) {
      throw new Error('Dữ liệu JSON không hợp lệ hoặc thiếu cấu trúc bắt buộc!');
    }

    // 1. Upsert Group
    const { error: gErr } = await client.from('groups').upsert({
      id: backup.group.id,
      name: backup.group.name,
      join_code: backup.group.join_code,
    });
    if (gErr) throw new Error(`Lỗi cập nhật nhóm: ${gErr.message}`);

    // 2. Upsert Songs
    if (backup.songs.length > 0) {
      const { error: sErr } = await client.from('songs').upsert(
        backup.songs.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist || '',
          normalized_title: s.normalized_title || normalizeSongTitle(s.title),
        })),
        { onConflict: 'normalized_title, artist' }
      );
      if (sErr) console.warn('Cảnh báo bài hát import:', sErr.message);
    }

    // 3. Upsert Members
    if (backup.members.length > 0) {
      const { error: mErr } = await client.from('members').upsert(
        backup.members.map(m => ({
          id: m.id,
          group_id: backup.group.id,
          display_name: m.display_name,
          avatar: m.avatar || '🎤',
        }))
      );
      if (mErr) throw new Error(`Lỗi cập nhật thành viên: ${mErr.message}`);
    }

    // 4. Upsert Member Songs
    if (backup.memberSongs.length > 0) {
      const { error: msErr } = await client.from('member_songs').upsert(
        backup.memberSongs.map(ms => ({
          id: ms.id,
          member_id: ms.member_id,
          song_id: ms.song_id,
          favorite: ms.favorite,
          priority: ms.priority,
        })),
        { onConflict: 'member_id, song_id' }
      );
      if (msErr) console.warn('Cảnh báo playlist import:', msErr.message);
    }

    return { success: true, message: `Nhập dữ liệu thành công cho nhóm "${backup.group.name}"!` };
  },
};

export const supabaseMemberRepo: IMemberRepository = {
  async getMembersByGroup(groupId: string): Promise<Member[]> {
    const client = checkClient();
    const { data, error } = await client
      .from('members')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createMember(groupId: string, displayName: string, avatar: string): Promise<Member> {
    const client = checkClient();
    const { data, error } = await client
      .from('members')
      .insert({
        group_id: groupId,
        display_name: cleanDisplayString(displayName),
        avatar: avatar || '🎤',
      })
      .select()
      .single();

    if (error) throw new Error(`Lỗi tạo thành viên: ${error.message}`);
    return data;
  },

  async updateMember(memberId: string, displayName: string, avatar: string): Promise<Member> {
    const client = checkClient();
    const { data, error } = await client
      .from('members')
      .update({
        display_name: cleanDisplayString(displayName),
        avatar,
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw new Error(`Lỗi cập nhật thành viên: ${error.message}`);
    return data;
  },

  async deleteMember(memberId: string): Promise<void> {
    const client = checkClient();
    const { error } = await client.from('members').delete().eq('id', memberId);
    if (error) throw new Error(`Lỗi xóa thành viên: ${error.message}`);
  },
};

export const supabaseSongRepo: ISongRepository = {
  async searchSongs(query: string): Promise<Song[]> {
    const client = checkClient();
    const norm = normalizeSongTitle(query);
    let builder = client.from('songs').select('*').limit(50);

    if (norm) {
      builder = builder.or(`normalized_title.ilike.%${norm}%,artist.ilike.%${query}%`);
    }
    const { data, error } = await builder;
    if (error) throw error;
    return data || [];
  },

  async findOrCreateSong(title: string, artist: string = ''): Promise<Song> {
    const client = checkClient();
    const cleanTitle = cleanDisplayString(title);
    const cleanArtist = cleanDisplayString(artist);
    const normTitle = normalizeSongTitle(cleanTitle);

    // Try finding existing song first
    const { data: existing } = await client
      .from('songs')
      .select('*')
      .eq('normalized_title', normTitle)
      .eq('artist', cleanArtist)
      .maybeSingle();

    if (existing) return existing;

    // Create new
    const { data, error } = await client
      .from('songs')
      .insert({
        title: cleanTitle,
        artist: cleanArtist,
        normalized_title: normTitle,
      })
      .select()
      .single();

    if (error) {
      // In case of race condition unique conflict, fetch again
      const { data: retry } = await client
        .from('songs')
        .select('*')
        .eq('normalized_title', normTitle)
        .eq('artist', cleanArtist)
        .single();
      if (retry) return retry;
      throw new Error(`Lỗi lưu bài hát: ${error.message}`);
    }
    return data;
  },

  async getAllSongs(): Promise<Song[]> {
    const client = checkClient();
    const { data, error } = await client.from('songs').select('*');
    if (error) throw error;
    return data || [];
  },
};

export const supabaseMemberSongRepo: IMemberSongRepository = {
  async getMemberSongs(memberId: string): Promise<MemberSong[]> {
    const client = checkClient();
    const { data, error } = await client
      .from('member_songs')
      .select('*, song:songs(*)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllMemberSongsForGroup(groupId: string): Promise<MemberSong[]> {
    const client = checkClient();
    // Get members first
    const { data: members, error: mErr } = await client
      .from('members')
      .select('id')
      .eq('group_id', groupId);

    if (mErr) throw mErr;
    const memberIds = (members || []).map(m => m.id);
    if (memberIds.length === 0) return [];

    const { data, error } = await client
      .from('member_songs')
      .select('*, song:songs(*)')
      .in('member_id', memberIds);

    if (error) throw error;
    return data || [];
  },

  async addSongToMember(
    memberId: string,
    songId: string,
    favorite = false,
    priority: Priority = 'NORMAL'
  ): Promise<MemberSong> {
    const client = checkClient();
    const { data, error } = await client
      .from('member_songs')
      .upsert(
        {
          member_id: memberId,
          song_id: songId,
          favorite,
          priority,
        },
        { onConflict: 'member_id, song_id' }
      )
      .select('*, song:songs(*)')
      .single();

    if (error) throw new Error(`Lỗi thêm vào danh sách: ${error.message}`);
    return data;
  },

  async updateMemberSong(id: string, updates: { favorite?: boolean; priority?: Priority }): Promise<MemberSong> {
    const client = checkClient();
    const { data, error } = await client
      .from('member_songs')
      .update(updates)
      .eq('id', id)
      .select('*, song:songs(*)')
      .single();

    if (error) throw new Error(`Lỗi cập nhật: ${error.message}`);
    return data;
  },

  async removeMemberSong(memberSongId: string): Promise<void> {
    const client = checkClient();
    const { error } = await client.from('member_songs').delete().eq('id', memberSongId);
    if (error) throw new Error(`Lỗi xóa bài: ${error.message}`);
  },
};

export const supabaseSessionRepo: ISessionRepository = {
  async getSessionsByGroup(groupId: string): Promise<KaraokeSession[]> {
    const client = checkClient();
    const { data, error } = await client
      .from('karaoke_sessions')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActiveSession(groupId: string): Promise<KaraokeSession | null> {
    const client = checkClient();
    const { data, error } = await client
      .from('karaoke_sessions')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createSession(
    groupId: string,
    title: string,
    participantIds: string[],
    initialSongs: { songId: string; score: number; priorityOrder: number }[]
  ): Promise<KaraokeSession> {
    const client = checkClient();

    // Mark previous active session as completed
    await client
      .from('karaoke_sessions')
      .update({ status: 'completed' })
      .eq('group_id', groupId)
      .eq('status', 'active');

    // Create session
    const { data: session, error: sErr } = await client
      .from('karaoke_sessions')
      .insert({
        group_id: groupId,
        title: cleanDisplayString(title) || `Karaoke ${new Date().toLocaleDateString('vi-VN')}`,
        status: 'active',
      })
      .select()
      .single();

    if (sErr) throw new Error(`Lỗi khởi tạo buổi hát: ${sErr.message}`);

    // Insert participants
    if (participantIds.length > 0) {
      await client.from('session_members').insert(
        participantIds.map(pid => ({
          session_id: session.id,
          member_id: pid,
        }))
      );
    }

    // Insert songs
    if (initialSongs.length > 0) {
      await client.from('session_songs').insert(
        initialSongs.map(isong => ({
          session_id: session.id,
          song_id: isong.songId,
          score: isong.score,
          priority_order: isong.priorityOrder,
          sung: false,
        }))
      );
    }

    return session;
  },

  async getSessionDetails(
    sessionId: string
  ): Promise<{ session: KaraokeSession; members: Member[]; songs: SessionSong[] } | null> {
    const client = checkClient();
    const { data: session, error: sErr } = await client
      .from('karaoke_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sErr || !session) return null;

    const { data: sessionMembers } = await client
      .from('session_members')
      .select('member:members(*)')
      .eq('session_id', sessionId);

    const members: Member[] = (sessionMembers || []).map((sm: any) => sm.member).filter(Boolean);

    const { data: songsData } = await client
      .from('session_songs')
      .select('*, song:songs(*)')
      .eq('session_id', sessionId)
      .order('priority_order', { ascending: true });

    return {
      session,
      members,
      songs: songsData || [],
    };
  },

  async toggleSongSung(sessionSongId: string, sung: boolean): Promise<void> {
    const client = checkClient();
    const { error } = await client
      .from('session_songs')
      .update({
        sung,
        sung_at: sung ? new Date().toISOString() : null,
      })
      .eq('id', sessionSongId);

    if (error) throw new Error(`Lỗi cập nhật trạng thái đã hát: ${error.message}`);
  },

  async updateSessionSongOrder(sessionSongId: string, priorityOrder: number): Promise<void> {
    const client = checkClient();
    const { error } = await client
      .from('session_songs')
      .update({ priority_order: priorityOrder })
      .eq('id', sessionSongId);

    if (error) throw error;
  },

  async completeSession(sessionId: string): Promise<void> {
    const client = checkClient();
    const { error } = await client
      .from('karaoke_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    if (error) throw error;
  },

  async getRecentlySungSongIds(groupId: string, limitSessions = 2): Promise<string[]> {
    const client = checkClient();
    const { data: sessions } = await client
      .from('karaoke_sessions')
      .select('id')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limitSessions);

    const sessionIds = (sessions || []).map(s => s.id);
    if (sessionIds.length === 0) return [];

    const { data: sungSongs } = await client
      .from('session_songs')
      .select('song_id')
      .in('session_id', sessionIds)
      .eq('sung', true);

    const ids = (sungSongs || []).map(ss => ss.song_id);
    return Array.from(new Set(ids));
  },
};
