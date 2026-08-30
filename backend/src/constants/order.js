export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const ORDER_STATUS_LABELS = {
  pending: '待确认',
  confirmed: '待付款',
  completed: '已完成',
  cancelled: '已取消',
}

export const ORDER_STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}
