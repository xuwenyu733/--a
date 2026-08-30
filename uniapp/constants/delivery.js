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

export const DELIVERY_STATUS_FILTERS = [
  { value: '', label: '全部' },
  { value: 'open', label: '待接单' },
  { value: 'accepted', label: '已接单' },
  { value: 'delivering', label: '配送中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export function deliveryStatusClass(status) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'info'
  if (status === 'open') return 'warning'
  return 'primary'
}

export const COURIER_SERVICE_TYPES = [
  { value: 'food', label: '外卖代取' },
  { value: 'express', label: '快递代取' },
  { value: 'other', label: '其他跑腿' },
]

export function labelOf(list, value) {
  return list.find((i) => i.value === value)?.label || value || ''
}
