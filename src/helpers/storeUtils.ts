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

import { Partner, Game } from '../types'; // Added import

export interface PartnerGameStates {
  plannedStreams: Game[];
  pendingAsks: Game[];
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
      } else {
        // Still waiting for a response.
        const gameHasAllNeededConfirmations = game.desiredPartners <= game.asks.filter(a => a.confirmed === true).length;
        const deadlinePassed = game.deadline && new Date(game.deadline) < now;

        if (!gameHasAllNeededConfirmations && !deadlinePassed) {
          pendingAsks.push(game);
        }
      }
    }
  }
  return { plannedStreams, pendingAsks };
}
