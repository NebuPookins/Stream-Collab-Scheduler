import { AskRecord, Game, Partner } from '../src/types';
import { findLatestOpenAsk, sortPartners } from '../src/helpers/partnerSorters';

const DAY = 1000 * 60 * 60 * 24;
const daysFromNow = (days: number): Date => new Date(Date.now() + days * DAY);

const partner = (id: string): Partner => ({ id, name: id });

const ask = (partnerId: string, confirmed: boolean | null, askedOn: Date = new Date()): AskRecord => ({
  partnerId,
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

const sortedIds = (partners: Partner[], games: Game[]): string[] =>
  sortPartners(partners, games).map(p => p.id);

describe('sortPartners', () => {
  it('puts partners with a planned stream after those without', () => {
    const games = [game({ asks: [ask('A', true)], scheduledTimes: [daysFromNow(3)] })];
    expect(sortedIds([partner('A'), partner('B')], games)).toEqual(['B', 'A']);
  });

  it('ignores planned streams of trashed games', () => {
    const games = [game({ trashed: true, asks: [ask('A', true)], scheduledTimes: [daysFromNow(3)] })];
    expect(sortedIds([partner('B'), partner('A')], games)).toEqual(['A', 'B']);
  });

  it('ignores planned streams of done games', () => {
    const games = [
      game({
        done: { date: daysFromNow(-1), streamingNotes: '' },
        asks: [ask('A', true)],
        scheduledTimes: [daysFromNow(3)],
      }),
    ];
    // B streamed more recently than A, so A comes first unless the stale schedule pushes A down.
    const b: Partner = { ...partner('B'), lastStreamedWith: daysFromNow(-0.5) };
    expect(sortedIds([b, partner('A')], games)).toEqual(['A', 'B']);
  });

  it('puts partners with a pending ask after those without', () => {
    const games = [game({ asks: [ask('A', null)] })];
    expect(sortedIds([partner('A'), partner('B')], games)).toEqual(['B', 'A']);
  });

  it('does not count asks whose deadline has passed', () => {
    const games = [game({ deadline: daysFromNow(-1), asks: [ask('A', null)] })];
    expect(sortedIds([partner('B'), partner('A')], games)).toEqual(['A', 'B']);
  });

  it('orders pending-ask partners by their most recent ask, using the latest re-ask', () => {
    const games = [
      game({ id: 'g1', asks: [ask('A', null, daysFromNow(-10)), ask('A', null, daysFromNow(-1))] }),
      game({ id: 'g2', asks: [ask('B', null, daysFromNow(-5))] }),
    ];
    // A's latest ask is 1 day ago, B's is 5 days ago; earliest most-recent ask comes first.
    expect(sortedIds([partner('A'), partner('B')], games)).toEqual(['B', 'A']);
  });

  it('puts available partners before busy ones, and busy ones by busyUntil ascending', () => {
    const partners: Partner[] = [
      { id: 'late', name: 'late', busyUntil: daysFromNow(10) },
      { id: 'free', name: 'free' },
      { id: 'soon', name: 'soon', busyUntil: daysFromNow(2) },
    ];
    expect(sortedIds(partners, [])).toEqual(['free', 'soon', 'late']);
  });

  it('preserves the extra properties of the input partners', () => {
    const result = sortPartners([{ ...partner('A'), extra: 42 }], []);
    expect(result[0].extra).toBe(42);
  });
});

describe('findLatestOpenAsk', () => {
  it('returns the most recent pending ask across re-asks', () => {
    const latest = daysFromNow(-1);
    const games = [game({ asks: [ask('A', null, daysFromNow(-9)), ask('A', null, latest)] })];
    expect(findLatestOpenAsk(partner('A'), games, new Date())).toEqual(latest);
  });

  it('returns undefined when the only ask is past its deadline', () => {
    const games = [game({ deadline: daysFromNow(-1), asks: [ask('A', null)] })];
    expect(findLatestOpenAsk(partner('A'), games, new Date())).toBeUndefined();
  });
});
