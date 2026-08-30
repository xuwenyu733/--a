import { ORDER_STATUS } from '../constants/order.js'

export const MAX_MESSAGE_CONTENT_LENGTH = 2000

export function sortParticipantIds(a, b) {
  const sa = a.toString()
  const sb = b.toString()
  return sa < sb ? [a, b] : [b, a]
}

export function validateSelfChat(userId, receiverId) {
  if (userId.toString() === receiverId.toString()) {
    return { ok: false, message: '不能与自己聊天', code: 40000 }
  }
  return { ok: true }
}

export function validateConversationParticipant(participants, userId, { forbiddenMessage = '无权查看' } = {}) {
  const uid = userId.toString()
  const ok = participants.some((p) => p._id?.toString?.() === uid || p.toString() === uid)
  if (!ok) {
    return { ok: false, message: forbiddenMessage, code: 40301 }
  }
  return { ok: true }
}

export function validateMessageContent(content, type, maxLen = MAX_MESSAGE_CONTENT_LENGTH) {
  if (type === 'image') return { ok: true }
  const text = (content || '').trim()
  if (!text) return { ok: false, message: '消息不能为空', code: 40000 }
  if (text.length > maxLen) {
    return { ok: false, message: `消息最多 ${maxLen} 字`, code: 40000 }
  }
  return { ok: true }
}

export function validateContactSeller(buyerId, sellerId) {
  if (buyerId.toString() === sellerId.toString()) {
    return { ok: false, message: '不能联系自己', code: 40000 }
  }
  return { ok: true }
}

export function buildLastMessagePreview(type, content) {
  if (type === 'image') return { content: '[图片]', type: 'image' }
  return { content: (content || '').slice(0, 100), type: type || 'text' }
}

export function formatConversationForUser(conversation, userId) {
  const uid = userId.toString()
  const obj = conversation.toObject ? conversation.toObject() : { ...conversation }
  const peer = (obj.participants || []).find(
    (p) => (p._id?.toString?.() || p.toString()) !== uid
  )
  const unreadMap = obj.unreadCounts
  let unread = 0
  if (unreadMap instanceof Map) unread = unreadMap.get(uid) || 0
  else if (unreadMap && typeof unreadMap === 'object') unread = unreadMap[uid] || 0
  return { ...obj, peer, unreadCount: unread }
}

export function sumUnreadCounts(conversations, userId) {
  const uid = userId.toString()
  return conversations.reduce((sum, conv) => {
    const map = conv.unreadCounts
    if (map instanceof Map) return sum + (map.get(uid) || 0)
    if (map && typeof map === 'object') return sum + (map[uid] || 0)
    return sum
  }, 0)
}
