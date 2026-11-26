// src/helpers/storeUtils.ts

/**
 * Extracts the Steam Application ID from a Steam store page URL.
 * @param storeUrl The URL of the store page.
 * @returns The Steam App ID if found, otherwise undefined.
 */
export function getSteamAppIdFromUrl(storeUrl: string): string | undefined {
  if (!storeUrl) {
    return undefined;
  }
  const match = storeUrl.match(/store.steampowered.com\/app\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

/**
 * Constructs the Steam cover image URL from a Steam Application ID.
 * @param steamAppId The Steam App ID.
 * @returns The URL of the cover image, or undefined if no app ID is provided.
 */
export function getSteamCoverUrl(steamAppId: string | undefined): string | undefined {
  if (!steamAppId) {
    return undefined;
  }
  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/header.jpg`;
}

import { Partner, Game, AskRecord } from '../types'; // Added import

export interface PartnerGameStates {
  plannedStreams: Game[];
  pendingAsks: Game[];
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether an ask is still waiting for a response that could matter: the game is active,
 * the partner hasn't answered, the game still needs partners, the deadline hasn't passed,
 * and the ask was made within the last `unansweredAskExpiryDays` days. An ask with an
 * invalid askedOn date is treated as expired.
 */
export function isAskPending(game: Game, ask: AskRecord, now: Date, unansweredAskExpiryDays: number): boolean {
  if (game.trashed || game.done || ask.confirmed !== null) {
    return false;
  }
  const gameHasAllNeededConfirmations = game.desiredPartners <= game.asks.filter(a => a.confirmed === true).length;
  const deadlinePassed = game.deadline !== undefined && new Date(game.deadline) < now;
  const askedOnMs = new Date(ask.askedOn).getTime();
  if (Number.isNaN(askedOnMs)) {
    console.warn('isAskPending: ask has an invalid askedOn date; treating it as expired', {
      gameId: game.id,
      gameName: game.name,
      partnerId: ask.partnerId,
      askedOn: ask.askedOn,
    });
  }
  const askExpired = Number.isNaN(askedOnMs) || now.getTime() - askedOnMs > unansweredAskExpiryDays * DAY_MS;
  return !gameHasAllNeededConfirmations && !deadlinePassed && !askExpired;
}

export function getPartnerGameStates(
  partner: Partner,
  allGames: Game[],
  unansweredAskExpiryDays: number,
  excludeGameId?: string,
  now: Date = new Date()
): PartnerGameStates {
  const partnerAsks = allGames
    .filter(game => !game.trashed && !game.done && game.id !== excludeGameId)
    .flatMap(game => {
      const ask = game.asks.find(a => a.partnerId === partner.id);
      return ask ? [{ game, ask }] : [];
    });

  return {
    plannedStreams: partnerAsks.filter(({ ask }) => ask.confirmed === true).map(({ game }) => game),
    pendingAsks: partnerAsks
      .filter(({ game, ask }) => isAskPending(game, ask, now, unansweredAskExpiryDays))
      .map(({ game }) => game),
  };
}
