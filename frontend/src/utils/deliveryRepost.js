const REPOST_DRAFT_KEY = 'delivery_repost_draft'

export function saveRepostDraft(order) {
  const zoneId = order?.zoneId?._id || order?.zoneId || ''
  sessionStorage.setItem(REPOST_DRAFT_KEY, JSON.stringify({
    type: order?.type || 'food',
    zoneId,
    title: order?.title || '',
    pickupAddress: order?.pickupAddress || '',
    dropoffAddress: order?.dropoffAddress || '',
    contactPhone: order?.contactPhone || '',
    fee: order?.fee != null ? Number(order.fee) : 5,
    description: order?.description || '',
    remark: order?.remark || '',
    fromOrders: true,
  }))
}

export function consumeRepostDraft() {
  const raw = sessionStorage.getItem(REPOST_DRAFT_KEY)
  if (!raw) return null
  sessionStorage.removeItem(REPOST_DRAFT_KEY)
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
