import {
  Member,
  MemberSong,
  Song,
  SongRecommendation,
  RecommendationConfig,
  Priority
} from '../../types';
import { DEFAULT_RECOMMENDATION_CONFIG } from '../../constants/recommendation';

export interface GeneratePlaylistInput {
  selectedMemberIds: string[];
  members: Member[];
  memberSongs: MemberSong[];
  allSongs: Song[];
  recentlySungSongIds?: string[];
  config?: Partial<RecommendationConfig>;
}

/**
 * Pure recommendation engine that generates a ranked collaborative karaoke playlist.
 * Follows the scoring formula:
 * score = (memberCount * COMMON_MEMBER_WEIGHT)
 *       + priorityScore
 *       + favoriteBonus
 *       + fairnessBonus
 *       - recentlySungPenalty
 */
export function generateKaraokePlaylist(input: GeneratePlaylistInput): SongRecommendation[] {
  const {
    selectedMemberIds,
    members,
    memberSongs,
    allSongs,
    recentlySungSongIds = [],
    config: customConfig
  } = input;

  const cfg: RecommendationConfig = {
    ...DEFAULT_RECOMMENDATION_CONFIG,
    ...customConfig
  };

  if (!selectedMemberIds || selectedMemberIds.length === 0) {
    return [];
  }

  const selectedSet = new Set(selectedMemberIds);
  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));
  const songMap = new Map<string, Song>(allSongs.map(s => [s.id, s]));

  // Step 1: Filter memberSongs to ONLY include chosen attendees
  const relevantMemberSongs = memberSongs.filter(ms => selectedSet.has(ms.member_id));

  // Step 2: Group by song_id
  const songToMemberEntries = new Map<string, MemberSong[]>();
  for (const ms of relevantMemberSongs) {
    const list = songToMemberEntries.get(ms.song_id) || [];
    list.push(ms);
    songToMemberEntries.set(ms.song_id, list);
  }

  const recentSet = new Set(recentlySungSongIds);
  const totalParticipants = selectedMemberIds.length;

  // Step 3: Compute base score and individual bonuses
  interface CandidateItem {
    song: Song;
    memberIds: string[];
    members: Member[];
    matchCount: number;
    baseScore: number;
    priorityBonus: number;
    favoriteBonus: number;
    recencyPenalty: number;
    rawScore: number;
    topPriority: Priority;
    hasFavorite: boolean;
  }

  const candidates: CandidateItem[] = [];

  for (const [songId, entries] of songToMemberEntries.entries()) {
    const song = songMap.get(songId);
    if (!song) continue;

    const matchedMemberIds = entries.map(e => e.member_id);
    const matchedMembers = matchedMemberIds
      .map(id => memberMap.get(id))
      .filter((m): m is Member => !!m);

    const matchCount = matchedMemberIds.length;
    const baseScore = matchCount * cfg.COMMON_MEMBER_WEIGHT;

    let priorityBonus = 0;
    let favoriteBonus = 0;
    let hasHigh = false;
    let hasWant = false;
    let hasFav = false;

    for (const entry of entries) {
      if (entry.priority === 'HIGH') {
        priorityBonus += cfg.HIGH_PRIORITY_BONUS;
        hasHigh = true;
      } else if (entry.priority === 'WANT_TO_SING') {
        priorityBonus += cfg.WANT_TO_SING_BONUS;
        hasWant = true;
      }

      if (entry.favorite) {
        favoriteBonus += cfg.FAVORITE_BONUS;
        hasFav = true;
      }
    }

    const isRecent = recentSet.has(songId);
    const recencyPenalty = isRecent ? cfg.RECENTLY_SUNG_PENALTY : 0;

    const rawScore = baseScore + priorityBonus + favoriteBonus - recencyPenalty;
    const topPriority: Priority = hasHigh ? 'HIGH' : hasWant ? 'WANT_TO_SING' : 'NORMAL';

    candidates.push({
      song,
      memberIds: matchedMemberIds,
      members: matchedMembers,
      matchCount,
      baseScore,
      priorityBonus,
      favoriteBonus,
      recencyPenalty,
      rawScore,
      topPriority,
      hasFavorite: hasFav,
    });
  }

  // Step 4: Fairness Interleaving
  // Initial sort: higher rawScore first, then higher matchCount, then alphabetically
  candidates.sort((a, b) => {
    if (b.rawScore !== a.rawScore) {
      return b.rawScore - a.rawScore;
    }
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    return a.song.title.localeCompare(b.song.title);
  });

  // Track how many songs have been allocated to each member in the top playlist
  const memberPlacementCount = new Map<string, number>();
  selectedMemberIds.forEach(id => memberPlacementCount.set(id, 0));

  const result: SongRecommendation[] = [];
  const remainingCandidates = [...candidates];

  while (remainingCandidates.length > 0) {
    let bestIndex = 0;
    let bestScoreWithFairness = -Infinity;
    let bestFairnessBonus = 0;

    // Evaluate candidates at the top of the pool (within window of 5 items or close scores)
    const windowSize = Math.min(5, remainingCandidates.length);

    for (let i = 0; i < windowSize; i++) {
      const candidate = remainingCandidates[i];

      // Calculate fairness bonus:
      // If a song is shared by multiple members, it doesn't need fairness boost.
      // If it's a single member's song, reward members who have fewer songs placed so far.
      let fairnessBonus = 0;
      if (candidate.matchCount === 1) {
        const memberId = candidate.memberIds[0];
        const placed = memberPlacementCount.get(memberId) || 0;
        const minPlaced = Math.min(...Array.from(memberPlacementCount.values()));

        // If this member has minimal placements, give fairness bonus
        if (placed === minPlaced) {
          fairnessBonus = cfg.FAIRNESS_BONUS;
        }
      }

      // Overlap consensus ALWAYS dominates (difference of COMMON_MEMBER_WEIGHT is usually 10 points),
      // fairnessBonus (e.g. 2 points) only reorders candidates with close or equal scores.
      const adjustedScore = candidate.rawScore + fairnessBonus;

      if (adjustedScore > bestScoreWithFairness) {
        bestScoreWithFairness = adjustedScore;
        bestIndex = i;
        bestFairnessBonus = fairnessBonus;
      }
    }

    const [selectedItem] = remainingCandidates.splice(bestIndex, 1);

    // Update placement counts for all members who know/have this song
    selectedItem.memberIds.forEach(id => {
      memberPlacementCount.set(id, (memberPlacementCount.get(id) || 0) + 1);
    });

    result.push({
      song: selectedItem.song,
      memberIds: selectedItem.memberIds,
      members: selectedItem.members,
      matchCount: selectedItem.matchCount,
      totalParticipants,
      score: selectedItem.rawScore + bestFairnessBonus,
      scoreBreakdown: {
        commonOverlapScore: selectedItem.baseScore,
        priorityBonus: selectedItem.priorityBonus,
        favoriteBonus: selectedItem.favoriteBonus,
        recencyPenalty: selectedItem.recencyPenalty,
        fairnessBonus: bestFairnessBonus,
      },
      isRecentlySung: selectedItem.recencyPenalty > 0,
      topPriority: selectedItem.topPriority,
      hasFavorite: selectedItem.hasFavorite,
    });
  }

  return result;
}
