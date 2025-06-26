import { Store } from "./types";
import { serialize, deserialize } from "./helpers/serializers";
import { get, set } from "idb-keyval";

const LOCAL_KEY = "streamCollabScheduler:data";

// Helper function to check if a store object seems to need date revival
function storeNeedsDateRevival(store: any): store is Store {
  if (store && typeof store === 'object') {
    if (store.partners && store.partners.length > 0) {
      const partner = store.partners[0];
      if (partner.lastStreamedWith && typeof partner.lastStreamedWith === 'string') return true;
      if (partner.busyUntil && typeof partner.busyUntil === 'string') return true;
    }
    if (store.games && store.games.length > 0) {
      const game = store.games[0];
      if (game.deadline && typeof game.deadline === 'string') return true;
      if (game.done && game.done.date && typeof game.done.date === 'string') return true;
      if (game.asks && game.asks.length > 0) {
        const ask = game.asks[0];
        if (ask.askedOn && typeof ask.askedOn === 'string') return true;
      }
    }
  }
  return false;
}

export async function loadStore(): Promise<Store> {
  const storedValue = await get(LOCAL_KEY) as Store | string | null;

  if (storedValue) {
    if (typeof storedValue === 'string') {
      // Data was stored as a JSON string (e.g., by a previous version of saveStore)
      return deserialize(storedValue);
    } else if (typeof storedValue === 'object' && storedValue !== null) {
      // Data was stored as an object.
      // Check if it needs date revival (e.g., from very old data or if structured cloning failed for some reason)
      if (storeNeedsDateRevival(storedValue)) {
        // Convert to JSON string (which handles Date.toJSON) then deserialize with our reviver
        return deserialize(JSON.stringify(storedValue));
      }
      // Otherwise, assume idb-keyval's structured cloning handled Date objects correctly
      return storedValue as Store;
    }
  }
  // Default empty store if nothing is found or type is unexpected
  return { games: [], partners: [], settings: { greyThresholdDays: 3, darkMode: false, dateFormat: "YYYY-MM-DD" } };
}

export async function saveStore(store: Store): Promise<void> {
  // Store the object directly, relying on idb-keyval's structured cloning
  await set(LOCAL_KEY, store);
}