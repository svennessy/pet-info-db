// in-memory cache for expensive db queries
// eg: GET /api/cat-pet-photos/stats
// instead of running COUNT(*) GROUP BY aggregate queries every time
// we store the result in memory for 60 seconds
// next time the same request comes in, we return the cached result
// after 60 seconds, the result is invalidated and the query is re-run

// every cache item contains actual data and a timestamp for when it expires
// example:
// { value: { totalPets: 5000 }, expiresAt: 1717000000000 }
type CacheEntry<T> = {
    value: T;
    expiresAt: number;
  };
  
  // map of key to cache entry
  const cache = new Map<string, CacheEntry<unknown>>();
  
  // three inputs:
  // cache key, how long to keep it, how long to compute it
  // example: cached("photo-pet-stats:cat", 60000, async () => { return expensiveDbQuery() })
  export async function cached<T>(
    key: string,
    ttlMs: number,
    getValue: () => Promise<T>,
  ): Promise<T> {
    // current time
    const now = Date.now();
    // check if cache has item with this key
    // example: photo-pet-stats:cat
    // returns: { value: { ... }, expiresAt: ... } or undefined
    const existing = cache.get(key);
  
    if (existing && existing.expiresAt > now) {
      // if cache has item and it hasn't expired, return the cached result
      return existing.value as T;
    }
  
    // if cache doesn't have item or it has expired, compute the value
    const value = await getValue();

    // store the value in cache for the given TTL
    cache.set(key, {
      value,
      expiresAt: now + ttlMs,
    });
  
    return value;
  }