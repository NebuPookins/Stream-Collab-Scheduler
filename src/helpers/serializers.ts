export function serialize(store: Store): string {
  return JSON.stringify(store, (_key, value) =>
    value instanceof Date ? value.toISOString() : value
  );
}

export function deserialize(data: string): Store {
  return JSON.parse(data, (_key, value) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }
    return value;
  });
}
