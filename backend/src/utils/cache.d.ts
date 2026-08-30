export function cacheGet(key: string): Promise<unknown>
export function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void>
export function cacheDel(key: string): Promise<void>
export function clearMemoryCache(): void
