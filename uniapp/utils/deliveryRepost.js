const REPOST_DRAFT_KEY = 'delivery_repost_draft'

/** 将订单内容写入本地草稿，供发布页参考填写（新建订单，不影响原单） */
export function saveRepostDraft(order) {
  const zoneId = order?.zoneId?._id || order?.zoneId || ''
  uni.setStorageSync(REPOST_DRAFT_KEY, {
    type: order?.type || 'food',
    zoneId,
    title: order?.title || '',
    pickupAddress: order?.pickupAddress || '',
    dropoffAddress: order?.dropoffAddress || '',
    contactPhone: order?.contactPhone || '',
    fee: order?.fee != null ? String(order.fee) : '5',
    description: order?.description || '',
    remark: order?.remark || '',
    fromOrders: true,
  })
}

/** 读取并清除草稿，仅生效一次 */
export function consumeRepostDraft() {
  const draft = uni.getStorageSync(REPOST_DRAFT_KEY)
  if (!draft || typeof draft !== 'object') return null
  uni.removeStorageSync(REPOST_DRAFT_KEY)
  return draft
}
