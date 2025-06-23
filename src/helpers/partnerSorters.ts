import { Partner } from '../types';
import { calculateGameScoreForPartner } from './tagUtils';

export const sortPartners = (
  partners: Partner[],
  gameTags?: string[]
): Partner[] => {
  const now = new Date();

  return [...partners].sort((a, b) => {
    // Primary sort: availability based on busyUntil
    const aIsAvailable = !a.busyUntil || new Date(a.busyUntil) <= now;
    const bIsAvailable = !b.busyUntil || new Date(b.busyUntil) <= now;

    if (aIsAvailable && !bIsAvailable) return -1; // a is available, b is not -> a comes first
    if (!aIsAvailable && bIsAvailable) return 1;  // b is available, a is not -> b comes first

    // If both are not available (i.e., busyUntil is in the future)
    if (!aIsAvailable && !bIsAvailable && a.busyUntil && b.busyUntil) {
      const busyUntilComparison = new Date(a.busyUntil).getTime() - new Date(b.busyUntil).getTime();
      if (busyUntilComparison !== 0) return busyUntilComparison; // Sort by date ascending
    }
    // If both are available (past or null busyUntil), or if future busyUntil dates are tied, proceed to next sort criterion.

    // Secondary sort: game score (descending) - only if gameTags are provided
    if (gameTags && gameTags.length > 0) {
      const scoreA = calculateGameScoreForPartner(gameTags, a.lovesTags, a.hatesTags);
      const scoreB = calculateGameScoreForPartner(gameTags, b.lovesTags, b.hatesTags);

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score comes first
      }
    }

    // Tertiary sort: by last streamed ascending (earlier/never streamed comes first)
    const lastStreamedA = a.lastStreamedWith ? new Date(a.lastStreamedWith).getTime() : 0; // Treat null/undefined as very old (0)
    const lastStreamedB = b.lastStreamedWith ? new Date(b.lastStreamedWith).getTime() : 0; // Treat null/undefined as very old (0)

    if (lastStreamedA !== lastStreamedB) {
      return lastStreamedA - lastStreamedB;
    }

    // Fallback sort: by name, ascending, for stable sort if all other criteria are equal
    return a.name.localeCompare(b.name);
  });
};
