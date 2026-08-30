export const REFUND_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

export const REFUND_STATUS_LABELS = {
  pending: '待处理',
  approved: '已同意',
  rejected: '已拒绝',
  cancelled: '已撤销',
}

/** 完成订单后可申请退款的天数 */
export const REFUND_WINDOW_DAYS = 7
