import { Store, Game, Partner, AskRecord } from '../types';

/**
 * A value as it may come out of storage or a backup file: every Date may still
 * be an ISO string.
 */
export type Revivable<T> =
  T extends Date ? Date | string :
  T extends (infer U)[] ? Revivable<U>[] :
  T extends object ? { [K in keyof T]: Revivable<T[K]> } :
  T;

const toDate = (value: Date | string): Date => new Date(value);

// JSON has no undefined, so a missing date may also arrive as null.
const toOptionalDate = (value: Date | string | null | undefined): Date | undefined =>
  value == null ? undefined : toDate(value);

const reviveAsk = (ask: Revivable<AskRecord>): AskRecord => ({
  ...ask,
  askedOn: toDate(ask.askedOn),
});

const reviveGame = (game: Revivable<Game>): Game => ({
  ...game,
  deadline: toOptionalDate(game.deadline),
  asks: game.asks.map(reviveAsk),
  done: game.done && { ...game.done, date: toDate(game.done.date) },
  scheduledTimes: game.scheduledTimes?.map(toDate),
});

const revivePartner = (partner: Revivable<Partner>): Partner => ({
  ...partner,
  lastStreamedWith: toOptionalDate(partner.lastStreamedWith),
  busyUntil: toOptionalDate(partner.busyUntil),
});

/**
 * Converts the Store's date fields back into Dates. Only those fields are
 * touched, so user-entered text that merely looks like a timestamp (a game
 * name, notes, metadata...) stays a string. Fields that are already Dates are
 * copied unchanged.
 */
export const reviveStoreDates = (store: Revivable<Store>): Store => ({
  ...store,
  games: store.games.map(reviveGame),
  partners: store.partners.map(revivePartner),
});

export function serialize(store: Store): string {
  return JSON.stringify(store);
}

export function deserialize(data: string): Store {
  return reviveStoreDates(JSON.parse(data));
}
