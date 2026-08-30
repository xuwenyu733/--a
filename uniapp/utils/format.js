import { labelOf, CONDITIONS as CONDITION_LIST } from '@/constants/product'

const CONDITION_MAP = Object.fromEntries(CONDITION_LIST.map((c) => [c.value, c.label]))

export const CONDITIONS = CONDITION_MAP

export const ORDER_STATUS = {
  pending: '待确认',
  confirmed: '待付款',
  completed: '已完成',
  cancelled: '已取消',
}

export const PAYMENT_STATUS = {
  none: '',
  pending_online: '待支付',
  buyer_marked: '待确认收款',
  seller_confirmed: '已确认收款',
  paid_online: '已在线支付',
}

export function formatPrice(price, tradeMode) {
  if (tradeMode === 'exchange' && !price) return '面议换物'
  return `¥${price}`
}

export function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return hm
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

export function previewMessage(msg) {
  if (!msg) return '暂无消息'
  if (typeof msg === 'string') return msg
  if (msg.type === 'image') return '[图片]'
  if (msg.type === 'system') return '[系统消息]'
  return msg.content || '暂无消息'
}

export { labelOf }
