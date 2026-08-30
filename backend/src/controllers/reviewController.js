import * as reviewService from '../services/reviewService.js'
import { success, fail, ErrorCodes } from '../utils/response.js'

export async function create(req, res, next) {
  try {
    const { rating, content } = req.body || {}
    const review = await reviewService.createOrderReview(req.params.orderId, req.user._id, {
      rating,
      content,
    })
    return success(res, review, '评价成功')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code >= 50000 ? 500 : 400)
    next(err)
  }
}

export async function orderSummary(req, res, next) {
  try {
    const data = await reviewService.getOrderReviewSummary(req.params.orderId, req.user._id)
    return success(res, data)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code >= 50000 ? 500 : 400)
    next(err)
  }
}

export async function listForUser(req, res, next) {
  try {
    const userId = req.params.userId || req.user._id
    const data = await reviewService.listReviewsForUser(userId, req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}
