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

/**
 * Whether an ask is still waiting for a response that could matter: the game is active,
 * the partner hasn't answered, the game still needs partners, and the deadline hasn't passed.
 */
export function isAskPending(game: Game, ask: AskRecord, now: Date): boolean {
  if (game.trashed || game.done || ask.confirmed !== null) {
    return false;
  }
  const gameHasAllNeededConfirmations = game.desiredPartners <= game.asks.filter(a => a.confirmed === true).length;
  const deadlinePassed = game.deadline !== undefined && new Date(game.deadline) < now;
  return !gameHasAllNeededConfirmations && !deadlinePassed;
}

export function getPartnerGameStates(
  partner: Partner,
  allGames: Game[],
  excludeGameId?: string
): PartnerGameStates {
  const plannedStreams: Game[] = [];
  const pendingAsks: Game[] = [];
  const now = new Date();

  for (const game of allGames) {
    if (game.trashed) {
      continue;
    }
    if (game.id === excludeGameId) {
      continue;
    }

    if (game.done) {
      continue;
    }

    const partnerAsk = game.asks.find(ask => ask.partnerId === partner.id);

    if (partnerAsk) {
      if (partnerAsk.confirmed === true) {
        plannedStreams.push(game);
      } else if (partnerAsk.confirmed === false) {
        //don't add to output.
      } else if (isAskPending(game, partnerAsk, now)) {
        pendingAsks.push(game);
      }
    }
  }
  return { plannedStreams, pendingAsks };
}
