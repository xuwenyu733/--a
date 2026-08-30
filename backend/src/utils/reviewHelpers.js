import { ORDER_STATUS } from '../constants/order.js'

export const REVIEW_CREDIT_GOOD = 2
export const REVIEW_CREDIT_BAD = -3

export function normalizeReviewRating(rating) {
  const r = Number(rating)
  if (!Number.isInteger(r) || r < 1 || r > 5) return null
  return r
}

export function validateCreateReview({
  orderStatus,
  buyerId,
  sellerId,
  reviewerId,
  hasExistingReview,
}) {
  const rid = reviewerId.toString()
  const isBuyer = buyerId.toString() === rid
  const isSeller = sellerId.toString() === rid
  if (!isBuyer && !isSeller) {
    return { ok: false, message: '无权评价该订单', code: 40301 }
  }
  if (orderStatus !== ORDER_STATUS.COMPLETED) {
    return { ok: false, message: '仅已完成订单可评价', code: 40000 }
  }
  if (hasExistingReview) {
    return { ok: false, message: '您已评价过该订单', code: 40900 }
  }
  return { ok: true, isBuyer, isSeller }
}

export function resolveRevieweeId({ isBuyer, buyerId, sellerId }) {
  return isBuyer ? sellerId : buyerId
}

export function getReviewCreditDelta(rating) {
  if (rating >= 4) return REVIEW_CREDIT_GOOD
  if (rating <= 2) return REVIEW_CREDIT_BAD
  return 0
}

export function trimReviewContent(content) {
  return (content || '').trim().slice(0, 500)
}

export function buildReviewSummary({ orderStatus, reviews, userId }) {
  const uid = userId.toString()
  const myReview = reviews.find((r) => {
    const rid = r.reviewerId?._id?.toString?.() || r.reviewerId?.toString?.()
    return rid === uid
  })
  const theirReview = reviews.find((r) => {
    const rid = r.reviewerId?._id?.toString?.() || r.reviewerId?.toString?.()
    return rid && rid !== uid
  })
  return {
    canReview: orderStatus === ORDER_STATUS.COMPLETED && !myReview,
    myReview: myReview || null,
    theirReview: theirReview || null,
  }
}

export function validateReviewViewer({ buyerId, sellerId, userId }) {
  const uid = userId.toString()
  if (buyerId.toString() !== uid && sellerId.toString() !== uid) {
    return { ok: false, message: '无权查看', code: 40301 }
  }
  return { ok: true }
}
