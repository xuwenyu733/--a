import TradeReview from '../models/TradeReview.js'
import Order from '../models/Order.js'
import { activeOrderFilter } from '../utils/orderQuery.js'
import User from '../models/User.js'
import { adjustCredit } from './creditService.js'
import { notifyUser } from './notificationService.js'
import { parsePagination, paginationMeta } from '../utils/pagination.js'
import {
  normalizeReviewRating,
  validateCreateReview,
  resolveRevieweeId,
  getReviewCreditDelta,
  trimReviewContent,
  buildReviewSummary,
  validateReviewViewer,
  REVIEW_CREDIT_GOOD,
  REVIEW_CREDIT_BAD,
} from '../utils/reviewHelpers.js'

export async function createOrderReview(orderId, reviewerId, { rating, content }) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId }))
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }

  const existing = await TradeReview.findOne({ orderId, reviewerId })
  const check = validateCreateReview({
    orderStatus: order.status,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    reviewerId,
    hasExistingReview: Boolean(existing),
  })
  if (!check.ok) {
    const err = new Error(check.message)
    err.code = check.code
    throw err
  }

  const r = normalizeReviewRating(rating)
  if (r == null) {
    const err = new Error('请选择 1～5 星评分')
    err.code = 40000
    throw err
  }

  const revieweeId = resolveRevieweeId({
    isBuyer: check.isBuyer,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
  })

  const review = await TradeReview.create({
    orderId,
    reviewerId,
    revieweeId,
    rating: r,
    content: trimReviewContent(content),
  })

  const creditDelta = getReviewCreditDelta(r)
  if (creditDelta === REVIEW_CREDIT_GOOD) {
    await adjustCredit(revieweeId, REVIEW_CREDIT_GOOD, 'trade_review_good')
  } else if (creditDelta === REVIEW_CREDIT_BAD) {
    await adjustCredit(revieweeId, REVIEW_CREDIT_BAD, 'trade_review_bad')
  }

  const reviewer = await User.findById(reviewerId).select('nickname')
  await notifyUser(revieweeId, {
    type: 'trade_review',
    title: '收到新评价',
    content: `${reviewer?.nickname || '对方'} 给您打了 ${r} 星`,
    relatedId: orderId,
  })

  return review.populate('reviewerId', 'nickname avatar')
}

export async function getOrderReviewSummary(orderId, userId) {
  const order = await Order.findOne(activeOrderFilter({ _id: orderId }))
  if (!order) {
    const err = new Error('订单不存在')
    err.code = 40400
    throw err
  }
  const viewCheck = validateReviewViewer({
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    userId,
  })
  if (!viewCheck.ok) {
    const err = new Error(viewCheck.message)
    err.code = viewCheck.code
    throw err
  }

  const reviews = await TradeReview.find({ orderId })
    .populate('reviewerId', 'nickname avatar')
    .lean()

  return buildReviewSummary({ orderStatus: order.status, reviews, userId })
}

export async function listReviewsForUser(userId, { page = 1, pageSize = 20 } = {}) {
  const { page: p, pageSize: ps, skip } = parsePagination({ page, pageSize })

  const filter = { revieweeId: userId }
  const [list, total] = await Promise.all([
    TradeReview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(ps)
      .populate('reviewerId', 'nickname avatar')
      .populate('orderId', 'productId')
      .lean(),
    TradeReview.countDocuments(filter),
  ])

  const avg = await TradeReview.aggregate([
    { $match: filter },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])

  return {
    list,
    stats: {
      count: avg[0]?.count || 0,
      avgRating: avg[0]?.avgRating ? Math.round(avg[0].avgRating * 10) / 10 : null,
    },
    pagination: paginationMeta(p, ps, total),
  }
}
