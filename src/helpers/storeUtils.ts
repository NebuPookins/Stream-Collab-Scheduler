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
