export const DELIVERY_ORDER_TYPES = {
  FOOD: 'food',
  EXPRESS: 'express',
  OTHER: 'other',
}

export const DELIVERY_ORDER_TYPE_LABELS = {
  food: '外卖代取',
  express: '快递代取',
  other: '其他跑腿',
}

export const DELIVERY_ORDER_STATUS = {
  OPEN: 'open',
  ACCEPTED: 'accepted',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

/** 超时未接单由系统自动取消时写入 cancelReason */
export const DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED = '系统：超过预计送达时间未接单'

export const DELIVERY_ORDER_STATUS_LABELS = {
  open: '待接单',
  accepted: '已接单',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
}

export const DEFAULT_ZONE_TEMPLATES = [
  { code: 'apt_1', name: '1号公寓', sortOrder: 1 },
  { code: 'apt_2', name: '2号公寓', sortOrder: 2 },
  { code: 'apt_3', name: '3号公寓', sortOrder: 3 },
  { code: 'apt_4', name: '4号公寓', sortOrder: 4 },
  { code: 'apt_5', name: '5号公寓', sortOrder: 5 },
  { code: 'apt_6', name: '6号公寓', sortOrder: 6 },
  { code: 'campus_other', name: '校内其他区域', sortOrder: 99 },
]
