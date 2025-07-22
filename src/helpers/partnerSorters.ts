import { Partner, Game } from '../types';
import { calculateGameScoreForPartner } from './tagUtils';

export const calculateLastStreamed = (partner: Partner, games: Game[]): Date | undefined => {
  const dates: Date[] = [];

  if (partner.lastStreamedWith) {
    dates.push(new Date(partner.lastStreamedWith));
  }

  games.forEach(game => {
    if (game.done && game.done.date) {
      const confirmedAsk = game.asks.find(ask => ask.partnerId === partner.id && ask.confirmed === true);
      if (confirmedAsk) {
        dates.push(new Date(game.done.date));
      }
    }
  });

  if (dates.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...dates.map(date => date.getTime())));
};

export const sortPartners = (
  partners: Partner[],
  games: Game[], // Added games array
  gameTags?: string[]
): Partner[] => {
  const now = new Date();

  return [...partners].sort((a, b) => {
    // Primary sort: availability based on busyUntil
    const aIsAvailable = !a.busyUntil || new Date(a.busyUntil) <= now;
    const bIsAvailable = !b.busyUntil || new Date(b.busyUntil) <= now;

    if (aIsAvailable && !bIsAvailable) return -1;
    if (!aIsAvailable && bIsAvailable) return 1;

    if (!aIsAvailable && !bIsAvailable && a.busyUntil && b.busyUntil) {
      const busyUntilComparison = new Date(a.busyUntil).getTime() - new Date(b.busyUntil).getTime();
      if (busyUntilComparison !== 0) return busyUntilComparison;
    }

    // Secondary sort: game score (descending) - only if gameTags are provided
    if (gameTags && gameTags.length > 0) {
      const scoreA = calculateGameScoreForPartner(gameTags, a.lovesTags, a.hatesTags);
      const scoreB = calculateGameScoreForPartner(gameTags, b.lovesTags, b.hatesTags);
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score comes first
      }
    }

    // Tertiary sort: by calculated last streamed ascending (earlier/never streamed comes first)
    const lastStreamedA = calculateLastStreamed(a, games);
    const lastStreamedB = calculateLastStreamed(b, games);

    const timeA = lastStreamedA ? lastStreamedA.getTime() : 0; // Treat undefined as very old (0)
    const timeB = lastStreamedB ? lastStreamedB.getTime() : 0; // Treat undefined as very old (0)

    if (timeA !== timeB) {
      return timeA - timeB; // Earlier date (smaller time value) comes first
    }

    // Fallback sort: by name, ascending
    return a.name.localeCompare(b.name);
  });
};
