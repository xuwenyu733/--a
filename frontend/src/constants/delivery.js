export const DELIVERY_ORDER_TYPES = [
  { value: 'food', label: '外卖代取' },
  { value: 'express', label: '快递代取' },
  { value: 'other', label: '其他跑腿' },
]

export const DELIVERY_ORDER_STATUS = {
  open: '待接单',
  accepted: '已接单',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
}

export function deliveryOrderStatusLabel(item) {
  if (item?.systemAcceptExpired) return '已逾期'
  return DELIVERY_ORDER_STATUS[item?.status] || item?.status || ''
}

export function deliveryStatusTagType(item) {
  if (item?.systemAcceptExpired) return 'danger'
  const map = { open: 'info', accepted: 'warning', delivering: 'primary', completed: 'success', cancelled: 'info' }
  return map[item?.status] || 'info'
}

export const COURIER_SERVICE_TYPES = [
  { value: 'food', label: '外卖代取' },
  { value: 'express', label: '快递代取' },
  { value: 'other', label: '其他跑腿' },
]
