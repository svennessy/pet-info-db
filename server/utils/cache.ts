type CacheEntry<T> = {
    value: T;
    expiresAt: number;
  };
  
  const cache = new Map<string, CacheEntry<unknown>>();
  
  export async function cached<T>(
    key: string,
    ttlMs: number,
    getValue: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now();
    const existing = cache.get(key);
  
    if (existing && existing.expiresAt > now) {
      return existing.value as T;
    }
  
    const value = await getValue();
  
    cache.set(key, {
      value,
      expiresAt: now + ttlMs,
    });
  
    return value;
  }