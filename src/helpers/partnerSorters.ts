import { Partner, Game } from '../types';
import { calculateGameScoreForPartner } from './tagUtils';
import { isAskPending } from './storeUtils';

const latestDate = (dates: Date[]): Date | undefined =>
  dates.length > 0 ? new Date(Math.max(...dates.map(date => date.getTime()))) : undefined;

const earliestDate = (dates: Date[]): Date | undefined =>
  dates.length > 0 ? new Date(Math.min(...dates.map(date => date.getTime()))) : undefined;

export const calculateLastStreamed = (partner: Partner, games: Game[]): Date | undefined => {
  const gameDates = games
    .filter(game => game.asks.some(ask => ask.partnerId === partner.id && ask.confirmed === true))
    .flatMap(game => game.done?.date ? [new Date(game.done.date)] : []);
  const knownDates = partner.lastStreamedWith ? [new Date(partner.lastStreamedWith)] : [];

  return latestDate([...knownDates, ...gameDates]);
};

export const findNextScheduledStream = (partner: Partner, games: Game[], now: Date): Date | undefined => {
  const futureScheduledTimes = games
    .filter(game => !game.trashed && !game.done)
    .filter(game => game.asks.some(ask => ask.partnerId === partner.id && ask.confirmed === true))
    .flatMap(game => game.scheduledTimes ?? [])
    .filter(scheduledTime => scheduledTime > now)
    .map(scheduledTime => new Date(scheduledTime));

  // Return the earliest future scheduled time
  return earliestDate(futureScheduledTimes);
};

export const findLatestOpenAsk = (partner: Partner, games: Game[], now: Date): Date | undefined => {
  const openAskDates = games.flatMap(game =>
    game.asks
      .filter(ask => ask.partnerId === partner.id && isAskPending(game, ask, now))
      .map(ask => new Date(ask.askedOn))
  );

  // Return the most recent open ask date
  return latestDate(openAskDates);
};

/**
 * Compares two optional dates: a missing date sorts before a present one,
 * and two present dates are ordered by `compareBoth`.
 */
const compareOptionalDates = (
  a: Date | undefined,
  b: Date | undefined,
  compareBoth: (a: Date, b: Date) => number
): number => {
  if (a && b) return compareBoth(a, b);
  if (a) return 1;
  if (b) return -1;
  return 0;
};

export const sortPartners = <P extends Partner>(
  partners: P[],
  games: Game[],
  gameTags?: string[]
): P[] => {
  const now = new Date();

  const decorated = partners.map(partner => ({
    partner,
    // Only partners still busy have a key; available ones sort first.
    busyUntil: partner.busyUntil && new Date(partner.busyUntil) > now ? new Date(partner.busyUntil) : undefined,
    gameScore: gameTags && gameTags.length > 0
      ? calculateGameScoreForPartner(gameTags, partner.lovesTags, partner.hatesTags)
      : 0,
    nextStream: findNextScheduledStream(partner, games, now),
    latestOpenAsk: findLatestOpenAsk(partner, games, now),
    lastStreamed: calculateLastStreamed(partner, games),
  }));

  return decorated
    .sort((a, b) =>
      // Primary sort: available partners first, then by busyUntil ascending
      compareOptionalDates(a.busyUntil, b.busyUntil, (aBusy, bBusy) => aBusy.getTime() - bBusy.getTime())
      // Then: game score (descending) - always 0 if no gameTags are provided
      || b.gameScore - a.gameScore
      // Then: partners with planned streams go to the bottom, with streams furthest in the future first
      || compareOptionalDates(a.nextStream, b.nextStream, (aNext, bNext) => bNext.getTime() - aNext.getTime())
      // Then: partners without open asks first, then by most recent open ask date (earliest first)
      || compareOptionalDates(a.latestOpenAsk, b.latestOpenAsk, (aAsk, bAsk) => aAsk.getTime() - bAsk.getTime())
      // Then: by calculated last streamed ascending (earlier/never streamed comes first)
      || compareOptionalDates(a.lastStreamed, b.lastStreamed, (aLast, bLast) => aLast.getTime() - bLast.getTime())
      // Fallback sort: by name, ascending
      || a.partner.name.localeCompare(b.partner.name)
    )
    .map(({ partner }) => partner);
};
