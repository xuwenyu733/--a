export const REVIEW_CREDIT_GOOD: number
export const REVIEW_CREDIT_BAD: number

export function normalizeReviewRating(rating: unknown): number | null

export function validateCreateReview(params: {
  orderStatus: string
  buyerId: unknown
  sellerId: unknown
  reviewerId: unknown
  hasExistingReview: boolean
}): { ok: true; isBuyer: boolean; isSeller: boolean } | { ok: false; message: string; code: number }

export function resolveRevieweeId(params: {
  isBuyer: boolean
  buyerId: unknown
  sellerId: unknown
}): unknown

export function getReviewCreditDelta(rating: number): number

export function trimReviewContent(content: string): string

export function buildReviewSummary(params: {
  orderStatus: string
  reviews: unknown[]
  userId: unknown
}): { canReview: boolean; myReview: unknown; theirReview: unknown }

export function validateReviewViewer(params: {
  buyerId: unknown
  sellerId: unknown
  userId: unknown
}): { ok: true } | { ok: false; message: string; code: number }
