import { RecommendationConfig } from '../types';

export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  // Member overlap is the primary signal (e.g. 10 points per matched attendee)
  COMMON_MEMBER_WEIGHT: 10,

  // Bonus for songs marked as favorite
  FAVORITE_BONUS: 3,

  // Bonuses for song priority
  HIGH_PRIORITY_BONUS: 5,
  WANT_TO_SING_BONUS: 2,

  // Penalty if the song was sung in the most recent session(s)
  RECENTLY_SUNG_PENALTY: 5,

  // Small fairness nudge to balance variety when scores are close
  FAIRNESS_BONUS: 2,
};
