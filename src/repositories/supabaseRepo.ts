import { requireSupabase } from '../services/supabase';
import type {
  Group,
  GroupMember,
  KaraokeSession,
  MemberSong,
  Profile,
  RecommendationBatch,
  SessionSong,
  Song,
} from '../types';
import type {
  IGroupRepository,
  IMemberSongRepository,
  IProfileRepository,
  ISessionRepository,
  ISongRepository,
  SessionDetails,
} from './types';
import { cleanDisplayString, matchesSearchQuery, normalizeArtist, normalizeSongTitle } from '../utils/normalize';

function message(error: { message: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (error.message.includes('row-level security')) return 'Bạn không có quyền thực hiện thao tác này.';
  return error.message;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  return data.user.id;
}

export const profileRepository: IProfileRepository = {
  async getMine() {
    const userId = await currentUserId();
    const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(message(error, 'Không thể tải hồ sơ.'));
    return data as Profile | null;
  },
  async upsertMine(displayName, avatarUrl = null) {
    const userId = await currentUserId();
    const name = cleanDisplayString(displayName);
    if (!name) throw new Error('Tên hiển thị không được để trống.');
    const { data, error } = await requireSupabase().from('profiles').upsert({
      id: userId,
      display_name: name,
      avatar_url: avatarUrl || null,
      onboarding_completed: true,
    }).select().single();
    if (error) throw new Error(message(error, 'Không thể lưu hồ sơ.'));
    return data as Profile;
  },
};

export const groupRepository: IGroupRepository = {
  async listMine() {
    const { data, error } = await requireSupabase().from('groups').select('*').order('created_at');
    if (error) throw new Error(message(error, 'Không thể tải nhóm.'));
    return (data ?? []) as Group[];
  },
  async create(name, requestedCode) {
    const normalizedCode = requestedCode?.trim().toUpperCase();
    const { data, error } = await requireSupabase().rpc('create_group_with_owner', {
      group_name: cleanDisplayString(name),
      ...(normalizedCode ? { requested_join_code: normalizedCode } : {}),
    });
    if (error) throw new Error(message(error, 'Không thể tạo nhóm.'));
    return data as Group;
  },
  async join(code) {
    const { data, error } = await requireSupabase().rpc('join_group_by_code', {
      requested_code: code.trim().toUpperCase(),
    });
    if (error) {
      if (error.message.includes('Invalid join code')) throw new Error('Mã tham gia không hợp lệ.');
      throw new Error(message(error, 'Không thể tham gia nhóm.'));
    }
    return data as Group;
  },
  async getMembers(groupId) {
    const { data, error } = await requireSupabase().from('group_members')
      .select('group_id,user_id,role,joined_at,profile:profiles(*)')
      .eq('group_id', groupId)
      .order('joined_at');
    if (error) throw new Error(message(error, 'Không thể tải thành viên.'));
    return (data ?? []) as unknown as GroupMember[];
  },
  async removeMember(groupId, userId) {
    const { error } = await requireSupabase().rpc('remove_group_member', {
      target_group: groupId,
      target_user: userId,
    });
    if (error) throw new Error(message(error, 'Không thể rời hoặc xóa thành viên.'));
  },
};

export const songRepository: ISongRepository = {
  async search(query) {
    const normalized = normalizeSongTitle(query).replace(/[^a-z0-9 ]/g, '');
    if (!normalized) return [];
    const { data, error } = await requireSupabase().from('songs').select('*')
      .or(`normalized_title.ilike.%${normalized}%,normalized_artist.ilike.%${normalized}%`)
      .limit(20);
    if (error) throw new Error(message(error, 'Không thể tìm bài hát.'));
    return (data ?? []) as Song[];
  },
  async findOrCreate(title, artist = '') {
    const displayTitle = cleanDisplayString(title);
    const displayArtist = cleanDisplayString(artist);
    const normalizedTitle = normalizeSongTitle(displayTitle);
    const normalizedArtist = normalizeArtist(displayArtist);
    if (!normalizedTitle) throw new Error('Tên bài hát không hợp lệ.');

    const client = requireSupabase();
    const { data: existing, error: lookupError } = await client.from('songs').select('*')
      .eq('normalized_title', normalizedTitle).eq('normalized_artist', normalizedArtist).maybeSingle();
    if (lookupError) throw new Error(message(lookupError, 'Không thể kiểm tra bài hát.'));
    if (existing) return existing as Song;

    const { data, error } = await client.from('songs').insert({
      title: displayTitle,
      artist: displayArtist,
      normalized_title: normalizedTitle,
      normalized_artist: normalizedArtist,
    }).select().single();
    if (!error) return data as Song;
    if (error.code === '23505') {
      const { data: raced } = await client.from('songs').select('*')
        .eq('normalized_title', normalizedTitle).eq('normalized_artist', normalizedArtist).single();
      if (raced) return raced as Song;
    }
    throw new Error(message(error, 'Không thể lưu bài hát.'));
  },
  async getAll() {
    const { data, error } = await requireSupabase().from('songs').select('*').order('title');
    if (error) throw new Error(message(error, 'Không thể tải danh mục bài hát.'));
    return (data ?? []) as Song[];
  },
};

export const memberSongRepository: IMemberSongRepository = {
  async getMine() {
    const userId = await currentUserId();
    const { data, error } = await requireSupabase().from('member_songs')
      .select('*,song:songs(*)').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw new Error(message(error, 'Không thể tải playlist.'));
    return (data ?? []) as unknown as MemberSong[];
  },
  async getForGroup(groupId) {
    const members = await groupRepository.getMembers(groupId);
    if (!members.length) return [];
    const { data, error } = await requireSupabase().from('member_songs')
      .select('*,song:songs(*)').in('user_id', members.map(item => item.user_id));
    if (error) throw new Error(message(error, 'Không thể tải bài hát của nhóm.'));
    return (data ?? []) as unknown as MemberSong[];
  },
  async add(songId, favorite = false, priority = 'NORMAL') {
    const userId = await currentUserId();
    const { data, error } = await requireSupabase().from('member_songs').upsert({
      user_id: userId, song_id: songId, favorite, priority,
    }, { onConflict: 'user_id,song_id' }).select('*,song:songs(*)').single();
    if (error) throw new Error(message(error, 'Không thể thêm bài hát.'));
    return data as unknown as MemberSong;
  },
  async update(id, updates) {
    const { data, error } = await requireSupabase().from('member_songs').update(updates)
      .eq('id', id).select('*,song:songs(*)').single();
    if (error) throw new Error(message(error, 'Không thể cập nhật bài hát.'));
    return data as unknown as MemberSong;
  },
  async remove(id) {
    const { error } = await requireSupabase().from('member_songs').delete().eq('id', id);
    if (error) throw new Error(message(error, 'Không thể xóa bài hát.'));
  },
};

export const sessionRepository: ISessionRepository = {
  async list(groupId) {
    const { data, error } = await requireSupabase().from('karaoke_sessions').select('*')
      .eq('group_id', groupId).order('created_at', { ascending: false });
    if (error) throw new Error(message(error, 'Không thể tải lịch sử.'));
    return (data ?? []) as KaraokeSession[];
  },
  async getActive(groupId) {
    const { data, error } = await requireSupabase().from('karaoke_sessions').select('*')
      .eq('group_id', groupId).eq('status', 'active').maybeSingle();
    if (error) throw new Error(message(error, 'Không thể tải phòng hát.'));
    return data as KaraokeSession | null;
  },
  async create(groupId, name, participantIds) {
    const userId = await currentUserId();
    if (participantIds.length < 2) throw new Error('Cần ít nhất 2 người tham gia để tạo hàng đợi song ca.');
    const client = requireSupabase();
    const { error: closeError } = await client.from('karaoke_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('group_id', groupId).eq('status', 'active');
    if (closeError) throw new Error(message(closeError, 'Không thể đóng buổi hát cũ.'));
    const { data, error } = await client.from('karaoke_sessions').insert({
      group_id: groupId,
      name: cleanDisplayString(name),
      created_by: userId,
    }).select().single();
    if (error) throw new Error(message(error, 'Không thể tạo buổi hát.'));
    const session = data as KaraokeSession;
    const { error: membersError } = await client.from('session_members').insert(
      [...new Set(participantIds)].map(id => ({ session_id: session.id, user_id: id })),
    );
    if (membersError) {
      await client.from('karaoke_sessions').delete().eq('id', session.id);
      throw new Error(message(membersError, 'Không thể lưu người tham gia.'));
    }
    return session;
  },
  async details(sessionId): Promise<SessionDetails | null> {
    const client = requireSupabase();
    const { data: session, error } = await client.from('karaoke_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (error) throw new Error(message(error, 'Không thể tải buổi hát.'));
    if (!session) return null;
    const [membersResult, songsResult, batchesResult] = await Promise.all([
      client.from('session_members').select('profile:profiles(*)').eq('session_id', sessionId),
      client.from('session_songs').select('*,song:songs(*)').eq('session_id', sessionId).order('queue_position'),
      client.from('recommendation_batches').select('*').eq('session_id', sessionId).order('batch_number'),
    ]);
    if (membersResult.error || songsResult.error || batchesResult.error) throw new Error('Không thể tải đầy đủ dữ liệu buổi hát.');
    return {
      session: session as KaraokeSession,
      members: (membersResult.data ?? []).map(row => row.profile).filter(Boolean) as unknown as Profile[],
      songs: (songsResult.data ?? []) as unknown as SessionSong[],
      batches: (batchesResult.data ?? []) as RecommendationBatch[],
    };
  },
  async addBatch(sessionId, recommendations, recycleMode) {
    if (!recommendations.length) return;
    const userId = await currentUserId();
    const client = requireSupabase();
    const [{ data: lastBatch }, { data: lastSong }] = await Promise.all([
      client.from('recommendation_batches').select('batch_number').eq('session_id', sessionId)
        .order('batch_number', { ascending: false }).limit(1).maybeSingle(),
      client.from('session_songs').select('queue_position').eq('session_id', sessionId)
        .order('queue_position', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const { data: batch, error: batchError } = await client.from('recommendation_batches').insert({
      session_id: sessionId,
      batch_number: (lastBatch?.batch_number ?? 0) + 1,
      recycle_mode: recycleMode,
      created_by: userId,
    }).select().single();
    if (batchError) throw new Error(message(batchError, 'Không thể tạo lượt đề xuất.'));
    const start = (lastSong?.queue_position ?? -1) + 1;
    const rows = recommendations.map((item, index) => ({
      session_id: sessionId,
      batch_id: batch.id,
      song_id: item.song.id,
      singer_1_id: item.singerIds[0],
      singer_2_id: item.singerIds[1],
      eligible_singer_ids: item.eligibleSingerIds,
      queue_position: start + index,
      score: item.score,
      score_metadata: item.scoreBreakdown,
      recycle_mode: recycleMode,
    }));
    const { error: songsError } = await client.from('session_songs').insert(rows);
    if (songsError) {
      await client.from('recommendation_batches').delete().eq('id', batch.id);
      if (songsError.code === '23505') throw new Error('Danh sách vừa thay đổi trên thiết bị khác. Hãy tải lại rồi thử lại.');
      throw new Error(message(songsError, 'Không thể lưu hàng đợi.'));
    }
  },
  async setSongState(id, played) {
    const { error } = await requireSupabase().from('session_songs').update({
      state: played ? 'PLAYED' : 'QUEUED', played_at: played ? new Date().toISOString() : null,
    }).eq('id', id);
    if (error) throw new Error(message(error, 'Không thể cập nhật trạng thái bài hát.'));
  },
  async prioritize(id, position) {
    const { error } = await requireSupabase().from('session_songs').update({ queue_position: position }).eq('id', id);
    if (error) throw new Error(message(error, 'Không thể sắp xếp hàng đợi.'));
  },
  async removeSong(id) {
    const { error } = await requireSupabase().from('session_songs').delete().eq('id', id);
    if (error) throw new Error(message(error, 'Không thể bỏ bài khỏi hàng đợi.'));
  },
  async complete(id) {
    const { error } = await requireSupabase().from('karaoke_sessions').update({
      status: 'completed', ended_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(message(error, 'Không thể kết thúc buổi hát.'));
  },
  async recentPlayed(groupId, sessionLimit = 2) {
    const { data: sessions, error } = await requireSupabase().from('karaoke_sessions').select('id')
      .eq('group_id', groupId).eq('status', 'completed').order('created_at', { ascending: false }).limit(sessionLimit);
    if (error) throw new Error(message(error, 'Không thể tải lịch sử gần đây.'));
    if (!sessions?.length) return [];
    const { data, error: songsError } = await requireSupabase().from('session_songs').select('song_id')
      .in('session_id', sessions.map(item => item.id)).eq('state', 'PLAYED');
    if (songsError) throw new Error(message(songsError, 'Không thể tải bài đã hát.'));
    return [...new Set((data ?? []).map(item => item.song_id))];
  },
};

export function filterSongsLocally(songs: Song[], query: string): Song[] {
  return songs.filter(song => matchesSearchQuery(song.title, query) || matchesSearchQuery(song.artist, query));
}
