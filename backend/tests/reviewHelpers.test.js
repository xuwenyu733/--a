import { describe, it, expect } from 'vitest'
import {
  normalizeReviewRating,
  validateCreateReview,
  getReviewCreditDelta,
  buildReviewSummary,
  REVIEW_CREDIT_GOOD,
  REVIEW_CREDIT_BAD,
} from '../src/utils/reviewHelpers.js'
import { ORDER_STATUS } from '../src/constants/order.js'

describe('reviewHelpers', () => {
  it('normalizeReviewRating accepts 1-5 only', () => {
    expect(normalizeReviewRating(5)).toBe(5)
    expect(normalizeReviewRating(0)).toBeNull()
    expect(normalizeReviewRating(3.5)).toBeNull()
  })

  it('validateCreateReview rejects non-participant', () => {
    const r = validateCreateReview({
      orderStatus: ORDER_STATUS.COMPLETED,
      buyerId: 'b1',
      sellerId: 's1',
      reviewerId: 'x1',
      hasExistingReview: false,
    })
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40301)
  })

  it('getReviewCreditDelta maps stars to credit', () => {
    expect(getReviewCreditDelta(5)).toBe(REVIEW_CREDIT_GOOD)
    expect(getReviewCreditDelta(1)).toBe(REVIEW_CREDIT_BAD)
    expect(getReviewCreditDelta(3)).toBe(0)
  })

  it('buildReviewSummary sets canReview when completed and no review', () => {
    const s = buildReviewSummary({
      orderStatus: ORDER_STATUS.COMPLETED,
      reviews: [],
      userId: 'b1',
    })
    expect(s.canReview).toBe(true)
    expect(s.myReview).toBeNull()
  })
})
