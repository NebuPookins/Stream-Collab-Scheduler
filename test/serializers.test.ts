import { Store } from '../src/types';
import { serialize, deserialize, reviveStoreDates } from '../src/helpers/serializers';

const timestampLike = '2025-07-01T20:00 stream went great';

const createStore = (): Store => ({
  games: [{
    id: 'g1',
    name: '2025-01-01T00:00:00.000Z',
    deadline: new Date('2025-08-01T00:00:00.000Z'),
    manualMetadata: { date: timestampLike, deadline: timestampLike },
    desiredPartners: 1,
    asks: [{
      partnerId: 'p1',
      askedOn: new Date('2025-06-01T12:00:00.000Z'),
      response: timestampLike,
      confirmed: true,
    }],
    tags: ['2025-01-01T tag'],
    notes: timestampLike,
    done: { date: new Date('2025-07-02T03:00:00.000Z'), streamingNotes: timestampLike },
    scheduledTimes: [new Date('2025-07-01T20:00:00.000Z'), new Date('2025-07-03T20:00:00.000Z')],
  }],
  partners: [{
    id: 'p1',
    name: timestampLike,
    lastStreamedWith: new Date('2025-05-01T00:00:00.000Z'),
    busyUntil: new Date('2025-09-01T00:00:00.000Z'),
    schedule: timestampLike,
  }],
  settings: { greyThresholdDays: 3, dateFormat: 'YYYY-MM-DD' },
});

describe('deserialize', () => {
  // toEqual distinguishes Dates from strings, so these round-trips check both
  // that every date field is revived and that timestamp-like text is not.
  it('round-trips a store, reviving only its date fields', () => {
    const store = createStore();
    expect(deserialize(serialize(store))).toEqual(store);
  });

  it('round-trips a pretty-printed backup', () => {
    const store = createStore();
    expect(deserialize(JSON.stringify(store, null, 2))).toEqual(store);
  });

  it('keeps user-entered text that looks like a timestamp as strings', () => {
    const [game] = deserialize(serialize(createStore())).games;
    expect(game.name).toBe('2025-01-01T00:00:00.000Z');
    expect(game.notes).toBe(timestampLike);
    expect(game.manualMetadata).toEqual({ date: timestampLike, deadline: timestampLike });
  });

  it('leaves optional date fields absent when they were absent', () => {
    const store: Store = {
      games: [{ id: 'g', name: 'Game', desiredPartners: 1, asks: [] }],
      partners: [{ id: 'p', name: 'Partner' }],
      settings: { greyThresholdDays: 3, dateFormat: 'YYYY-MM-DD' },
    };
    const { games: [game], partners: [partner] } = deserialize(serialize(store));
    expect(game.deadline).toBeUndefined();
    expect(game.done).toBeUndefined();
    expect(game.scheduledTimes).toBeUndefined();
    expect(partner.lastStreamedWith).toBeUndefined();
    expect(partner.busyUntil).toBeUndefined();
  });
});

describe('reviveStoreDates', () => {
  it('accepts a store whose dates are already Dates', () => {
    const store = createStore();
    expect(reviveStoreDates(store)).toEqual(store);
  });
});
