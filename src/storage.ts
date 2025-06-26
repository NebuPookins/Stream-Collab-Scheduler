import { Store } from "./types";
import { serialize, deserialize } from "./helpers/serializers";
import { get, set } from "idb-keyval";

const LOCAL_KEY = "streamCollabScheduler:data";

export async function loadStore(): Promise<Store> {
  const idbVal = await get(LOCAL_KEY);
  if (idbVal) {
    return idbVal as Store;
  }
  // default empty store
  return { games: [], partners: [], settings: { greyThresholdDays: 3, darkMode: false, dateFormat: "YYYY-MM-DD" } };
}

export async function saveStore(store: Store) {
  const s = serialize(store);
  // also mirror to IndexedDB
  await set(LOCAL_KEY, store);
}