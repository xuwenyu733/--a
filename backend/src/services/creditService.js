import User from '../models/User.js'
import Product from '../models/Product.js'
import { CREDIT, getCreditLevel } from '../constants/credit.js'

export { getCreditLevel, CREDIT }

export async function adjustCredit(userId, delta, reason = '') {
  if (!userId || !delta) return null
  const user = await User.findById(userId)
  if (!user) return null

  const current = user.creditScore ?? CREDIT.DEFAULT
  const next = Math.max(CREDIT.MIN, Math.min(CREDIT.MAX, current + delta))
  if (next === current) {
    return { creditScore: current, delta: 0, reason }
  }

  user.creditScore = next
  await user.save()
  return { userId: user._id, creditScore: next, delta, reason, level: getCreditLevel(next) }
}

export async function rewardOrderComplete(order) {
  await Promise.all([
    adjustCredit(order.buyerId, CREDIT.ORDER_COMPLETE, 'order_completed_buyer'),
    adjustCredit(order.sellerId, CREDIT.ORDER_COMPLETE, 'order_completed_seller'),
  ])
}

export async function penalizeReportResolved(report) {
  if (report.targetType === 'user') {
    return adjustCredit(report.targetId, CREDIT.REPORT_USER_PENALTY, 'report_resolved_user')
  }
  if (report.targetType === 'product') {
    const product = await Product.findById(report.targetId).select('sellerId')
    if (product?.sellerId) {
      return adjustCredit(
        product.sellerId,
        CREDIT.REPORT_PRODUCT_SELLER_PENALTY,
        'report_resolved_product'
      )
    }
  }
  return null
}
