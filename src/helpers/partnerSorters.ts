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

export const findNextScheduledStream = (partner: Partner, games: Game[]): Date | undefined => {
  const now = new Date();
  const futureScheduledTimes: Date[] = [];

  games.forEach(game => {
    if (game.scheduledTimes) {
      game.scheduledTimes.forEach(scheduledTime => {
        if (scheduledTime > now) {
          // Check if this partner is confirmed for this game
          const confirmedAsk = game.asks.find(ask => ask.partnerId === partner.id && ask.confirmed === true);
          if (confirmedAsk) {
            futureScheduledTimes.push(new Date(scheduledTime));
          }
        }
      });
    }
  });

  if (futureScheduledTimes.length === 0) {
    return undefined;
  }

  // Return the earliest future scheduled time
  return new Date(Math.min(...futureScheduledTimes.map(date => date.getTime())));
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

    // Secondary sort: partners with planned streams go to the bottom, with streams furthest in the future first
    const aNextStream = findNextScheduledStream(a, games);
    const bNextStream = findNextScheduledStream(b, games);

    // If one has a planned stream and the other doesn't, the one without goes first
    if (aNextStream && !bNextStream) return 1;
    if (!aNextStream && bNextStream) return -1;

    // If both have planned streams, sort by stream date (furthest in future first)
    if (aNextStream && bNextStream) {
      const streamComparison = bNextStream.getTime() - aNextStream.getTime();
      if (streamComparison !== 0) return streamComparison;
    }

    // Tertiary sort: game score (descending) - only if gameTags are provided
    if (gameTags && gameTags.length > 0) {
      const scoreA = calculateGameScoreForPartner(gameTags, a.lovesTags, a.hatesTags);
      const scoreB = calculateGameScoreForPartner(gameTags, b.lovesTags, b.hatesTags);
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score comes first
      }
    }

    // Quaternary sort: by calculated last streamed ascending (earlier/never streamed comes first)
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
