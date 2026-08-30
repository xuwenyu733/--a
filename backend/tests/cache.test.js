import { describe, it, expect } from 'vitest'
import { clearMemoryCache, cacheGet, cacheSet } from '../src/utils/cache.js'

describe('cache', () => {
  it('stores and retrieves in memory', async () => {
    clearMemoryCache()
    await cacheSet('k1', { ok: true }, 60)
    expect(await cacheGet('k1')).toEqual({ ok: true })
  })

  it('returns null for missing key', async () => {
    clearMemoryCache()
    expect(await cacheGet('missing')).toBeNull()
  })
})
