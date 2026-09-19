import { describe, expect, it } from 'vitest';
import type { Member, MemberSong, QueueHistoryItem, Song } from '../../types';
import { calculateSessionStats, generateKaraokePlaylist, inspectAvailability } from './engine';

const members: Member[] = ['A', 'B', 'C', 'D', 'E'].map(id => ({ id, display_name: id }));
const songs: Song[] = Array.from({ length: 70 }, (_, index) => ({
  id: `s${String(index).padStart(2, '0')}`,
  title: `Song ${index}`,
  artist: 'Artist',
  normalized_title: `song ${index}`,
  normalized_artist: 'artist',
}));

const memberships: MemberSong[] = songs.flatMap((song, index) => {
  const eligible = index === 0 ? ['A', 'B', 'C', 'D', 'E'] : index === 1 ? ['A', 'B'] : [
    members[index % members.length].id,
    members[(index + 1) % members.length].id,
    ...(index % 3 === 0 ? [members[(index + 2) % members.length].id] : []),
  ];
  return [...new Set(eligible)].map((userId, entryIndex) => ({
    id: `${song.id}-${userId}`,
    user_id: userId,
    song_id: song.id,
    favorite: entryIndex === 0 && index % 4 === 0,
    priority: index % 5 === 0 ? 'HIGH' as const : 'NORMAL' as const,
  }));
});

const base = { selectedMemberIds: members.map(member => member.id), members, memberSongs: memberships, allSongs: songs };
const toHistory = (result: ReturnType<typeof generateKaraokePlaylist>): QueueHistoryItem[] => result.map(item => ({
  songId: item.song.id,
  singerIds: item.singerIds,
  state: 'QUEUED',
}));

describe('deterministic duet recommendation engine', () => {
  it('handles exactly two members sharing one song', () => {
    const twoMemberSong = memberships.filter(item => item.song_id === 's01');
    const result = generateKaraokePlaylist({
      selectedMemberIds: ['A', 'B'], members, memberSongs: twoMemberSong, allSongs: [songs[1]],
    });
    expect(result).toHaveLength(1);
    expect(result[0].singerIds).toEqual(['A', 'B']);
  });

  it('assigns exactly two eligible singers to a shared song', () => {
    const result = generateKaraokePlaylist({ ...base, limit: 1 });
    expect(result[0].singerIds).toHaveLength(2);
    expect(result[0].singerIds.every(id => result[0].eligibleSingerIds.includes(id))).toBe(true);
  });

  it('ranks a song known by many participants strongly', () => {
    expect(generateKaraokePlaylist({ ...base, limit: 1 })[0].song.id).toBe('s00');
  });

  it('rotates pairs dynamically when compatibility permits', () => {
    const pairs = generateKaraokePlaylist({ ...base, limit: 12 }).map(item => item.singerIds.join('+'));
    expect(new Set(pairs).size).toBeGreaterThan(3);
  });

  it('penalizes a repeated pair when an alternative exists', () => {
    const history: QueueHistoryItem[] = [{ songId: 'old', singerIds: ['A', 'B'], state: 'PLAYED' }];
    const result = generateKaraokePlaylist({ ...base, sessionHistory: history, limit: 1 });
    expect(result[0].singerIds).not.toEqual(['A', 'B']);
  });

  it('penalizes singers who just sang', () => {
    const history: QueueHistoryItem[] = [{ songId: 'old', singerIds: ['A', 'B'], state: 'PLAYED' }];
    const shared = memberships.filter(item => item.song_id === 's00');
    const result = generateKaraokePlaylist({ ...base, memberSongs: shared, allSongs: [songs[0]], sessionHistory: history });
    expect(result[0].singerIds.every(id => !['A', 'B'].includes(id))).toBe(true);
  });

  it('makes rested valid singers more likely', () => {
    const history: QueueHistoryItem[] = [
      { songId: 'x', singerIds: ['A', 'B'], state: 'PLAYED' },
      { songId: 'y', singerIds: ['A', 'C'], state: 'PLAYED' },
    ];
    const result = generateKaraokePlaylist({ ...base, memberSongs: memberships.filter(item => item.song_id === 's00'), allSongs: [songs[0]], sessionHistory: history });
    expect(result[0].singerIds).toEqual(['D', 'E']);
  });

  it('keeps turns reasonably balanced with compatible data', () => {
    const result = generateKaraokePlaylist({ ...base, limit: 40 });
    const stats = calculateSessionStats(members.map(member => member.id), toHistory(result));
    const turns = Object.values(stats.turnsByMember);
    expect(Math.max(...turns) - Math.min(...turns)).toBeLessThanOrEqual(3);
  });

  it('never assigns a singer who does not know a song', () => {
    const result = generateKaraokePlaylist(base);
    expect(result.every(item => item.singerIds.every(id => item.eligibleSingerIds.includes(id)))).toBe(true);
  });

  it('returns at most 50 entries by default', () => {
    expect(generateKaraokePlaylist(base)).toHaveLength(50);
  });

  it('excludes all queued songs from the second normal batch', () => {
    const first = generateKaraokePlaylist({ ...base, limit: 20 });
    const second = generateKaraokePlaylist({ ...base, sessionHistory: toHistory(first), limit: 50 });
    const firstIds = new Set(first.map(item => item.song.id));
    expect(second.every(item => !firstIds.has(item.song.id))).toBe(true);
  });

  it('excludes played songs from normal generation', () => {
    const history: QueueHistoryItem[] = [{ songId: 's00', singerIds: ['A', 'B'], state: 'PLAYED' }];
    expect(generateKaraokePlaylist({ ...base, sessionHistory: history }).some(item => item.song.id === 's00')).toBe(false);
  });

  it('returns 17 when only 17 unused eligible songs remain', () => {
    const history: QueueHistoryItem[] = songs.slice(0, 53).map(song => ({ songId: song.id, singerIds: ['A', 'B'], state: 'QUEUED' }));
    expect(generateKaraokePlaylist({ ...base, sessionHistory: history })).toHaveLength(17);
  });

  it('detects exhaustion after every eligible song is reserved', () => {
    const history = songs.map(song => ({ songId: song.id, singerIds: ['A', 'B'] as [string, string], state: 'QUEUED' as const }));
    expect(inspectAvailability({ ...base, sessionHistory: history })).toEqual({ eligibleSongs: 70, unusedSongs: 0, exhausted: true });
  });

  it('recycles only after explicit recycle activation', () => {
    const history = songs.map(song => ({ songId: song.id, singerIds: ['A', 'B'] as [string, string], state: 'PLAYED' as const }));
    expect(generateKaraokePlaylist({ ...base, sessionHistory: history })).toHaveLength(0);
    expect(generateKaraokePlaylist({ ...base, sessionHistory: history, recycleMode: true })).toHaveLength(50);
  });

  it('makes songs normally available in a new session', () => {
    const oldSession = songs.map(song => ({ songId: song.id, singerIds: ['A', 'B'] as [string, string], state: 'PLAYED' as const }));
    expect(generateKaraokePlaylist({ ...base, sessionHistory: oldSession })).toHaveLength(0);
    expect(generateKaraokePlaylist(base)).toHaveLength(50);
  });

  it('persists fairness statistics across batches', () => {
    const first = generateKaraokePlaylist({ ...base, limit: 15 });
    const firstStats = calculateSessionStats(members.map(member => member.id), toHistory(first));
    const second = generateKaraokePlaylist({ ...base, sessionHistory: toHistory(first), limit: 15 });
    const combined = calculateSessionStats(members.map(member => member.id), [...toHistory(first), ...toHistory(second)]);
    expect(Object.values(combined.turnsByMember).reduce((a, b) => a + b, 0)).toBe(
      Object.values(firstStats.turnsByMember).reduce((a, b) => a + b, 0) + second.length * 2,
    );
  });

  it('excludes solo-only songs from the duet queue', () => {
    const soloOnly = memberships.filter(item => item.song_id === 's01' && item.user_id === 'A');
    expect(generateKaraokePlaylist({ ...base, memberSongs: soloOnly, allSongs: [songs[1]] })).toEqual([]);
  });

  it('ignores song knowledge belonging to absent group members', () => {
    const result = generateKaraokePlaylist({ ...base, selectedMemberIds: ['A', 'B'] });
    expect(result.every(item => item.eligibleSingerIds.every(id => ['A', 'B'].includes(id)))).toBe(true);
  });
});
