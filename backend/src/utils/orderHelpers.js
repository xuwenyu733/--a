import { ORDER_STATUS, ORDER_STATUS_FLOW } from '../constants/order.js'
import { ROLES } from '../constants/roles.js'
import { PRODUCT_STATUS } from '../constants/product.js'

export function canTransitionOrderStatus(current, next) {
  return Boolean(ORDER_STATUS_FLOW[current]?.includes(next))
}

export function validateOrderStatusUpdate({ currentStatus, nextStatus, isBuyer, isSeller }) {
  if (!isBuyer && !isSeller) {
    return { ok: false, message: '无权操作', code: 40301 }
  }
  if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
    return { ok: false, message: '无效的状态变更', code: 40000 }
  }
  if (nextStatus === ORDER_STATUS.CONFIRMED && !isSeller) {
    return { ok: false, message: '仅卖家可确认订单', code: 40301 }
  }
  return { ok: true }
}

export function validateCreateOrder({ buyer, product, quantity = 1 }) {
  if (buyer.role !== ROLES.STUDENT || !buyer.studentVerified) {
    return { ok: false, message: '仅已认证学生可下单', code: 40301 }
  }
  if (!product) {
    return { ok: false, message: '商品不存在', code: 40400 }
  }
  if (product.status !== PRODUCT_STATUS.ON_SALE) {
    return { ok: false, message: '商品不可购买', code: 40000 }
  }
  if (product.sellerId.toString() === buyer._id.toString()) {
    return { ok: false, message: '不能购买自己的商品', code: 40000 }
  }
  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1) {
    return { ok: false, message: '购买数量至少为 1', code: 40000 }
  }
  const stock = Number(product.stock)
  if (!Number.isFinite(stock) || stock < 1) {
    return { ok: false, message: '商品已无库存', code: 40000 }
  }
  if (qty > stock) {
    return { ok: false, message: '商品已无库存', code: 40000 }
  }
  return { ok: true }
}

export function validateMarkBuyerPaid({ orderStatus, paymentStatus, buyerId, userId }) {
  if (buyerId.toString() !== userId.toString()) {
    return { ok: false, message: '仅买家可标记付款', code: 40301 }
  }
  if (orderStatus !== ORDER_STATUS.CONFIRMED) {
    return { ok: false, message: '当前订单状态不可标记付款', code: 40000 }
  }
  if (paymentStatus === 'paid_online' || paymentStatus === 'seller_confirmed') {
    return { ok: false, message: '订单已付款', code: 40900 }
  }
  return { ok: true }
}

export function validateConfirmSellerPayment({ orderStatus, paymentStatus, sellerId, userId }) {
  if (sellerId.toString() !== userId.toString()) {
    return { ok: false, message: '仅卖家可确认收款', code: 40301 }
  }
  if (orderStatus !== ORDER_STATUS.CONFIRMED) {
    return { ok: false, message: '当前订单状态不可确认收款', code: 40000 }
  }
  if (paymentStatus !== 'buyer_marked' && paymentStatus !== 'paid_online') {
    return { ok: false, message: '买家尚未标记付款', code: 40000 }
  }
  if (paymentStatus === 'seller_confirmed') {
    return { ok: false, message: '已确认收款', code: 40900 }
  }
  return { ok: true }
}

export function validateHideOrder({ orderStatus, buyerId, sellerId, userId }) {
  const uid = userId.toString()
  if (buyerId.toString() !== uid && sellerId.toString() !== uid) {
    return { ok: false, message: '无权操作', code: 40301 }
  }
  if (![ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(orderStatus)) {
    return { ok: false, message: '仅已完成或已取消的订单可移除', code: 40000 }
  }
  return { ok: true }
}
