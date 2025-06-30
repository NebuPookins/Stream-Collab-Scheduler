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

/**
 * Filters games to find open asks for a specific partner.
 * @param partner The partner for whom to find open asks.
 * @param games An array of all games.
 * @returns An array of games that are open asks for the partner.
 */
export function getOpenAsksForPartner(partner: Partner, games: Game[]): Game[] {
  const openAsks: Game[] = [];
  const now = new Date();

  for (const game of games) {
    // Check if the game deadline is in the past
    if (game.deadline && new Date(game.deadline) < now) {
      continue;
    }

    // Check if the game has met its desired partner amount
    const confirmedPartnersCount = game.asks.filter(ask => ask.confirmed).length;
    if (confirmedPartnersCount >= game.desiredPartners) {
      continue;
    }

    // Find asks for the current partner
    const partnerAsk = game.asks.find(
      (ask: AskRecord) =>
        ask.partnerId === partner.id &&
        !ask.confirmed &&
        (ask.response === undefined || ask.response === '')
    );

    if (partnerAsk) {
      openAsks.push(game);
    }
  }

  return openAsks;
}
