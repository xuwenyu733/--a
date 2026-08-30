import { describe, it, expect } from 'vitest'
import {
  recommendationScore,
  buildRecCacheKey,
  mergeRecommendationItems,
} from '../src/services/recommendationService.js'

describe('recommendationService', () => {
  it('recommendationScore weights favorites and new listings', () => {
    const now = Date.parse('2026-06-01T12:00:00Z')
    const hot = recommendationScore(
      { favoriteCount: 5, viewCount: 10, createdAt: '2026-05-01T00:00:00Z' },
      now
    )
    const fresh = recommendationScore(
      { favoriteCount: 0, viewCount: 0, createdAt: '2026-05-31T00:00:00Z' },
      now
    )
    expect(hot).toBeGreaterThan(fresh)
  })

  it('buildRecCacheKey includes region and product', () => {
    expect(buildRecCacheKey({ regionId: 'r1', productId: 'p1', limit: 8, userId: 'u1' })).toBe(
      'rec:r1:p1:u1:8'
    )
  })

  it('mergeRecommendationItems dedupes and respects cap', () => {
    const seen = new Set()
    const collected = []
    mergeRecommendationItems(
      collected,
      seen,
      [{ _id: 'a' }, { _id: 'b' }, { _id: 'a' }],
      { cap: 2, excludeIds: [] }
    )
    expect(collected).toHaveLength(2)
    expect(collected.map((x) => x._id)).toEqual(['a', 'b'])
  })
})
