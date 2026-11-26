import { AskRecord, Game, Partner } from '../src/types';
import { DAY_MS, getPartnerGameStates, isAskPending } from '../src/helpers/storeUtils';

const EXPIRY_DAYS = 10;
const now = new Date('2026-11-02T12:00:00Z');
const daysAgo = (days: number): Date => new Date(now.getTime() - days * DAY_MS);

const ask = (askedOn: Date, confirmed: boolean | null = null): AskRecord => ({
  partnerId: 'A',
  askedOn,
  confirmed,
});

const game = (overrides: Partial<Game>): Game => ({
  id: 'g',
  name: 'Game',
  desiredPartners: 5,
  asks: [],
  ...overrides,
});

describe('isAskPending', () => {
  it('treats a recent unanswered ask as pending', () => {
    const a = ask(daysAgo(EXPIRY_DAYS - 1));
    expect(isAskPending(game({ asks: [a] }), a, now, EXPIRY_DAYS)).toBe(true);
  });

  it('treats an unanswered ask older than the expiry threshold as not pending', () => {
    const a = ask(daysAgo(EXPIRY_DAYS + 1));
    expect(isAskPending(game({ asks: [a] }), a, now, EXPIRY_DAYS)).toBe(false);
  });
});

describe('isAskPending with a custom expiry', () => {
  it('uses the given number of days as the threshold', () => {
    const a = ask(daysAgo(5));
    expect(isAskPending(game({ asks: [a] }), a, now, 3)).toBe(false);
    expect(isAskPending(game({ asks: [a] }), a, now, 7)).toBe(true);
  });

  it('treats an ask with an invalid askedOn date as expired and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = ask(new Date('not a date'));
    expect(isAskPending(game({ asks: [a] }), a, now, EXPIRY_DAYS)).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('getPartnerGameStates', () => {
  const partner: Partner = { id: 'A', name: 'A' };

  it('omits games whose unanswered ask to the partner has expired', () => {
    const games = [
      game({ id: 'old', asks: [ask(daysAgo(EXPIRY_DAYS + 1))] }),
      game({ id: 'recent', asks: [ask(daysAgo(1))] }),
    ];
    expect(getPartnerGameStates(partner, games, EXPIRY_DAYS, undefined, now).pendingAsks.map(g => g.id)).toEqual(['recent']);
  });

  it('still reports confirmed streams regardless of when they were asked', () => {
    const games = [game({ id: 'old', asks: [ask(daysAgo(30), true)] })];
    expect(getPartnerGameStates(partner, games, EXPIRY_DAYS, undefined, now).plannedStreams.map(g => g.id)).toEqual(['old']);
  });
});
