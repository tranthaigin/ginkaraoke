import { DEFAULT_RECOMMENDATION_CONFIG } from '../../constants/recommendation';
import type {
  Member,
  MemberSong,
  Priority,
  QueueHistoryItem,
  RecommendationConfig,
  RecommendationScoreBreakdown,
  SessionStats,
  Song,
  SongRecommendation,
} from '../../types';

export interface GeneratePlaylistInput {
  selectedMemberIds: string[];
  members: Member[];
  memberSongs: MemberSong[];
  allSongs: Song[];
  sessionHistory?: QueueHistoryItem[];
  recentlySungSongIds?: string[];
  recycleMode?: boolean;
  limit?: number;
  config?: Partial<RecommendationConfig>;
  random?: () => number;
}

export interface Availability {
  eligibleSongs: number;
  unusedSongs: number;
  exhausted: boolean;
}

interface Candidate {
  song: Song;
  eligibleSingerIds: string[];
  compatibility: number;
  priority: number;
  favorite: number;
  recentHistoryPenalty: number;
  topPriority: Priority;
  hasFavorite: boolean;
}

interface EngineState {
  turns: Map<string, number>;
  pairs: Map<string, number>;
  partners: Map<string, Set<string>>;
  lastSeen: Map<string, number>;
  previous: string[] | null;
  position: number;
}

const pairKey = (a: string, b: string): string => [a, b].sort().join('|');

function buildCandidates(input: GeneratePlaylistInput, cfg: RecommendationConfig): Candidate[] {
  const selected = new Set(input.selectedMemberIds);
  const songs = new Map(input.allSongs.map(song => [song.id, song]));
  const bySong = new Map<string, MemberSong[]>();
  for (const item of input.memberSongs) {
    if (!selected.has(item.user_id)) continue;
    const entries = bySong.get(item.song_id) ?? [];
    if (!entries.some(entry => entry.user_id === item.user_id)) entries.push(item);
    bySong.set(item.song_id, entries);
  }

  const recent = new Set(input.recentlySungSongIds ?? []);
  const used = new Set((input.sessionHistory ?? []).map(item => item.songId));
  const result: Candidate[] = [];

  for (const [songId, entries] of bySong) {
    const song = songs.get(songId);
    if (!song || entries.length < 2 || (!input.recycleMode && used.has(songId))) continue;
    const priorities = entries.map(entry => entry.priority);
    const priority = entries.reduce((sum, entry) => sum + (
      entry.priority === 'HIGH'
        ? cfg.HIGH_PRIORITY_BONUS
        : entry.priority === 'WANT_TO_SING'
          ? cfg.WANT_TO_SING_BONUS
          : 0
    ), 0);
    const favorites = entries.filter(entry => entry.favorite).length;
    result.push({
      song,
      eligibleSingerIds: entries.map(entry => entry.user_id).sort(),
      compatibility: entries.length * cfg.COMMON_MEMBER_WEIGHT,
      priority,
      favorite: favorites * cfg.FAVORITE_BONUS,
      recentHistoryPenalty: recent.has(songId) ? cfg.RECENT_HISTORY_PENALTY : 0,
      topPriority: priorities.includes('HIGH') ? 'HIGH' : priorities.includes('WANT_TO_SING') ? 'WANT_TO_SING' : 'NORMAL',
      hasFavorite: favorites > 0,
    });
  }
  return result;
}

function historyState(memberIds: string[], history: QueueHistoryItem[]): EngineState {
  const turns = new Map(memberIds.map(id => [id, 0]));
  const pairs = new Map<string, number>();
  const partners = new Map<string, Set<string>>(memberIds.map(id => [id, new Set<string>()]));
  const lastSeen = new Map<string, number>();
  let previous: string[] | null = null;

  history.forEach((item, index) => {
    const [a, b] = item.singerIds;
    if (!a) {
      previous = null;
      return;
    }
    turns.set(a, (turns.get(a) ?? 0) + 1);
    lastSeen.set(a, index);
    if (b) {
      turns.set(b, (turns.get(b) ?? 0) + 1);
      const key = pairKey(a, b);
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
      partners.get(a)?.add(b);
      partners.get(b)?.add(a);
      lastSeen.set(b, index);
      previous = [a, b];
    } else {
      previous = [a];
    }
  });

  return { turns, pairs, partners, lastSeen, previous, position: history.length };
}

function scorePair(
  a: string,
  b: string,
  state: ReturnType<typeof historyState>,
  cfg: RecommendationConfig,
) {
  const maximumTurns = Math.max(0, ...state.turns.values());
  const fairness = (maximumTurns * 2 - (state.turns.get(a) ?? 0) - (state.turns.get(b) ?? 0)) * cfg.FAIRNESS_WEIGHT;
  const restA = state.lastSeen.has(a) ? state.position - state.lastSeen.get(a)! - 1 : 5;
  const restB = state.lastSeen.has(b) ? state.position - state.lastSeen.get(b)! - 1 : 5;
  const rest = (Math.min(restA, 5) + Math.min(restB, 5)) * cfg.REST_WEIGHT;
  const repeats = state.pairs.get(pairKey(a, b)) ?? 0;
  const repeatedPairPenalty = repeats * cfg.REPEATED_PAIR_PENALTY;
  const pairDiversity = repeats === 0 ? cfg.PAIR_DIVERSITY_BONUS : 0;
  const previousSet = new Set<string>(state.previous ?? []);
  const consecutiveSingerPenalty = (Number(previousSet.has(a)) + Number(previousSet.has(b))) * cfg.CONSECUTIVE_SINGER_PENALTY;
  return { fairness, rest, pairDiversity, repeatedPairPenalty, consecutiveSingerPenalty };
}

function bestPair(candidate: Candidate, state: ReturnType<typeof historyState>, cfg: RecommendationConfig) {
  let winner: { pair: [string, string]; values: ReturnType<typeof scorePair>; score: number } | null = null;
  for (let i = 0; i < candidate.eligibleSingerIds.length; i += 1) {
    for (let j = i + 1; j < candidate.eligibleSingerIds.length; j += 1) {
      const pair: [string, string] = [candidate.eligibleSingerIds[i], candidate.eligibleSingerIds[j]];
      const values = scorePair(pair[0], pair[1], state, cfg);
      const score = values.fairness + values.rest + values.pairDiversity
        - values.repeatedPairPenalty - values.consecutiveSingerPenalty;
      if (!winner || score > winner.score || (score === winner.score && pairKey(...pair) < pairKey(...winner.pair))) {
        winner = { pair, values, score };
      }
    }
  }
  return winner!;
}

export function generateKaraokePlaylist(input: GeneratePlaylistInput): SongRecommendation[] {
  const cfg = { ...DEFAULT_RECOMMENDATION_CONFIG, ...input.config };
  const memberIds = [...new Set(input.selectedMemberIds)].sort();
  if (memberIds.length < 2) return [];
  const validMemberIds = new Set(input.members.map(member => member.id));
  const selected = memberIds.filter(id => validMemberIds.has(id));
  if (selected.length < 2) return [];

  const history = input.sessionHistory ?? [];
  const state = historyState(selected, history);
  const candidates = buildCandidates({ ...input, selectedMemberIds: selected }, cfg);
  const output: SongRecommendation[] = [];
  const cap = Math.max(0, Math.min(input.limit ?? cfg.MAX_BATCH_SIZE, cfg.MAX_BATCH_SIZE));

  while (candidates.length > 0 && output.length < cap) {
    let winnerIndex = 0;
    let winnerPair = bestPair(candidates[0], state, cfg);
    let winnerScore = -Infinity;

    candidates.forEach((candidate, index) => {
      const pairing = bestPair(candidate, state, cfg);
      const total = candidate.compatibility + candidate.priority + candidate.favorite
        + pairing.score - candidate.recentHistoryPenalty;
      const winnerId = candidates[winnerIndex]?.song.id ?? '';
      if (total > winnerScore || (total === winnerScore && candidate.song.id < winnerId)) {
        winnerIndex = index;
        winnerPair = pairing;
        winnerScore = total;
      }
    });

    const [candidate] = candidates.splice(winnerIndex, 1);
    const [a, b] = winnerPair.pair;
    const breakdown: RecommendationScoreBreakdown = {
      compatibility: candidate.compatibility,
      priority: candidate.priority,
      favorite: candidate.favorite,
      pairDiversity: winnerPair.values.pairDiversity,
      fairness: winnerPair.values.fairness,
      rest: winnerPair.values.rest,
      repeatedPairPenalty: winnerPair.values.repeatedPairPenalty,
      consecutiveSingerPenalty: winnerPair.values.consecutiveSingerPenalty,
      recentHistoryPenalty: candidate.recentHistoryPenalty,
    };
    output.push({
      song: candidate.song,
      eligibleSingerIds: candidate.eligibleSingerIds,
      singerIds: [a, b],
      matchCount: candidate.eligibleSingerIds.length,
      totalParticipants: selected.length,
      score: winnerScore,
      scoreBreakdown: breakdown,
      topPriority: candidate.topPriority,
      hasFavorite: candidate.hasFavorite,
      recycleMode: Boolean(input.recycleMode),
    });

    state.turns.set(a, (state.turns.get(a) ?? 0) + 1);
    state.turns.set(b, (state.turns.get(b) ?? 0) + 1);
    const key = pairKey(a, b);
    state.pairs.set(key, (state.pairs.get(key) ?? 0) + 1);
    state.partners.get(a)?.add(b);
    state.partners.get(b)?.add(a);
    state.lastSeen.set(a, state.position);
    state.lastSeen.set(b, state.position);
    state.previous = [a, b];
    state.position += 1;
  }
  return output;
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function buildRandomCandidates(input: GeneratePlaylistInput) {
  const validMemberIds = new Set(input.members.map(member => member.id));
  const selected = new Set(input.selectedMemberIds.filter(id => validMemberIds.has(id)));
  const songs = new Map(input.allSongs.map(song => [song.id, song]));
  const used = new Set((input.sessionHistory ?? []).map(item => item.songId));
  const entriesBySong = new Map<string, MemberSong[]>();

  for (const item of input.memberSongs) {
    if (!selected.has(item.user_id) || (!input.recycleMode && used.has(item.song_id))) continue;
    const entries = entriesBySong.get(item.song_id) ?? [];
    if (!entries.some(entry => entry.user_id === item.user_id)) entries.push(item);
    entriesBySong.set(item.song_id, entries);
  }

  return [...entriesBySong.entries()].flatMap(([songId, entries]) => {
    const song = songs.get(songId);
    if (!song || !entries.length) return [];
    const priorities = entries.map(entry => entry.priority);
    return [{
      song,
      eligibleSingerIds: entries.map(entry => entry.user_id),
      topPriority: priorities.includes('HIGH') ? 'HIGH' as const
        : priorities.includes('WANT_TO_SING') ? 'WANT_TO_SING' as const
          : 'NORMAL' as const,
      hasFavorite: entries.some(entry => entry.favorite),
    }];
  });
}

/**
 * Random mode deliberately ignores overlap, priority, favorite, fairness and
 * history scoring. It samples distinct songs uniformly from the union of the
 * selected attendees' playlists. Random mode deliberately leaves both singer
 * slots empty: eligibleSingerIds records whose playlists contain the song so
 * the UI can show its source without assigning anyone to perform it.
 */
export function generateRandomPlaylist(input: GeneratePlaylistInput): SongRecommendation[] {
  const cfg = { ...DEFAULT_RECOMMENDATION_CONFIG, ...input.config };
  const random = input.random ?? Math.random;
  const candidates = shuffled(buildRandomCandidates(input), random);
  const cap = Math.max(0, Math.min(input.limit ?? cfg.MAX_BATCH_SIZE, cfg.MAX_BATCH_SIZE));
  const emptyBreakdown: RecommendationScoreBreakdown = {
    compatibility: 0,
    priority: 0,
    favorite: 0,
    pairDiversity: 0,
    fairness: 0,
    rest: 0,
    repeatedPairPenalty: 0,
    consecutiveSingerPenalty: 0,
    recentHistoryPenalty: 0,
  };

  return candidates.slice(0, cap).map(candidate => {
    return {
      song: candidate.song,
      eligibleSingerIds: candidate.eligibleSingerIds,
      singerIds: [null, null],
      matchCount: candidate.eligibleSingerIds.length,
      totalParticipants: new Set(input.selectedMemberIds).size,
      score: 0,
      scoreBreakdown: { ...emptyBreakdown },
      topPriority: candidate.topPriority,
      hasFavorite: candidate.hasFavorite,
      recycleMode: Boolean(input.recycleMode),
    };
  });
}

export function inspectAvailability(input: GeneratePlaylistInput): Availability {
  const cfg = { ...DEFAULT_RECOMMENDATION_CONFIG, ...input.config };
  const eligibleSongs = buildCandidates({ ...input, recycleMode: true }, cfg).length;
  const unusedSongs = buildCandidates({ ...input, recycleMode: false }, cfg).length;
  return { eligibleSongs, unusedSongs, exhausted: eligibleSongs > 0 && unusedSongs === 0 };
}

export function inspectRandomAvailability(input: GeneratePlaylistInput): Availability {
  const eligibleSongs = buildRandomCandidates({ ...input, recycleMode: true }).length;
  const unusedSongs = buildRandomCandidates({ ...input, recycleMode: false }).length;
  return { eligibleSongs, unusedSongs, exhausted: eligibleSongs > 0 && unusedSongs === 0 };
}

export function calculateSessionStats(memberIds: string[], history: QueueHistoryItem[]): SessionStats {
  const state = historyState(memberIds, history);
  return {
    turnsByMember: Object.fromEntries(state.turns),
    pairCounts: Object.fromEntries(state.pairs),
    uniquePartnersByMember: Object.fromEntries([...state.partners].map(([id, values]) => [id, [...values].sort()])),
    songsQueued: history.filter(item => item.state === 'QUEUED').length,
    songsPlayed: history.filter(item => item.state === 'PLAYED').length,
  };
}
