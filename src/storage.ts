import { Store } from "./types";
import { deserialize, reviveStoreDates, Revivable } from "./helpers/serializers";
import { get, set } from "idb-keyval";

const LOCAL_KEY = "streamCollabScheduler:data";

export async function loadStore(): Promise<Store> {
  const storedValue = await get<Revivable<Store> | string>(LOCAL_KEY);

  if (storedValue) {
    if (typeof storedValue === 'string') {
      // Data was stored as a JSON string (e.g., by a previous version of saveStore)
      return deserialize(storedValue);
    } else if (typeof storedValue === 'object' && storedValue !== null) {
      // Data was stored as an object. idb-keyval's structured cloning normally
      // preserves Dates, but older data may still hold them as strings.
      return reviveStoreDates(storedValue);
    }
  }
  // Default empty store if nothing is found or type is unexpected
  return { games: [], partners: [], settings: { greyThresholdDays: 3, darkMode: false, dateFormat: "YYYY-MM-DD", defaultScheduledHour: 18, defaultScheduledMinute: 0 } };
}

export async function saveStore(store: Store): Promise<void> {
  // Store the object directly, relying on idb-keyval's structured cloning
  await set(LOCAL_KEY, store);
}