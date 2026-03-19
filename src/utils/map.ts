export function getOrThrow<K, V>(map: Map<K, V>, key: K, message?: string): V {
    const value = map.get(key);
    if (value === undefined) {
        throw new Error(message ?? `Key ${String(key)} not found in map`);
    }
    return value;
}
