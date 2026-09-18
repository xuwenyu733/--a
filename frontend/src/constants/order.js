export const ORDER_STATUS_LABELS = {
  pending: '待确认',
  confirmed: '待付款',
  completed: '已完成',
  cancelled: '已取消',
}

export const ORDER_STATUS_TYPE = {
  pending: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'info',
}

export const PAYMENT_STATUS_LABELS = {
  none: '',
  pending_online: '待完成在线支付',
  buyer_marked: '待卖家确认收款',
  seller_confirmed: '卖家已确认收款',
  paid_online: '已在线支付',
}

export const REFUND_STATUS_LABELS = {
  pending: '退款处理中',
  approved: '已同意退款',
  rejected: '已拒绝退款',
  cancelled: '已撤销申请',
}

const REFUND_ELIGIBLE_PAYMENT = new Set(['paid_online', 'seller_confirmed', 'buyer_marked'])
const REFUND_WINDOW_DAYS = 7

export function canApplyRefund(order, existingRefund) {
  if (!order || order.status !== 'completed') return false
  if (!REFUND_ELIGIBLE_PAYMENT.has(order.paymentStatus)) return false
  if (existingRefund?.status === 'pending' || existingRefund?.status === 'approved') return false
  if (!order.completedAt) return false
  const windowMs = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - new Date(order.completedAt).getTime() <= windowMs
}

export const PAYMENT_METHOD_LABELS = {
  manual: '扫码转账',
  wechat: '微信支付',
  alipay: '支付宝',
}
