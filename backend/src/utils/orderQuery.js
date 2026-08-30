/** 未软删除的订单条件 */
export function activeOrderFilter(extra = {}) {
  return { ...extra, deletedAt: null }
}

export function isOrderDeleted(order) {
  return order?.deletedAt != null
}
