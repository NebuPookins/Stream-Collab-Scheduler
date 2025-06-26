import { Store } from "./types";
import { serialize, deserialize } from "./helpers/serializers";
import { get, set } from "idb-keyval";

const LOCAL_KEY = "streamCollabScheduler:data";

export async function loadStore(): Promise<Store> {
  const storedValue = await get(LOCAL_KEY);

  if (storedValue) {
    if (typeof storedValue === 'string') {
      // Value was stored as a string (ideally by our serialize function)
      return deserialize(storedValue);
    } else {
      // Value was stored as an object (e.g. by older version or direct idb-keyval usage)
      // To ensure our date reviver logic is applied consistently,
      // we convert it to a JSON string then deserialize it through our reviver.
      // JSON.stringify will convert any Date objects to ISO strings via their toJSON method.
      return deserialize(JSON.stringify(storedValue));
    }
  }
  // default empty store
  return { games: [], partners: [], settings: { greyThresholdDays: 3, darkMode: false, dateFormat: "YYYY-MM-DD" } };
}

export async function saveStore(store: Store): Promise<void> {
  // Always store the stringified version using our custom serializer
  // to ensure dates are consistently stored as ISO strings.
  const serializedStore = serialize(store);
  await set(LOCAL_KEY, serializedStore);
}