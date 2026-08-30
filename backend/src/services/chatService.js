import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import { connectionManager } from '../websocket/connectionManager.js'
import { WS_EVENTS } from '../constants/wsEvents.js'
import {
  sortParticipantIds,
  validateSelfChat,
  validateConversationParticipant,
  validateMessageContent,
  validateContactSeller,
  buildLastMessagePreview,
  formatConversationForUser,
  sumUnreadCounts,
  MAX_MESSAGE_CONTENT_LENGTH,
} from '../utils/chatHelpers.js'
import { parsePagination, paginationMeta } from '../utils/pagination.js'

export { formatConversationForUser } from '../utils/chatHelpers.js'

export async function getOrCreateConversation(userId, receiverId, productId = null) {
  const selfCheck = validateSelfChat(userId, receiverId)
  if (!selfCheck.ok) {
    const err = new Error(selfCheck.message)
    err.code = selfCheck.code
    throw err
  }
  const receiver = await User.findById(receiverId)
  if (!receiver) {
    const err = new Error('用户不存在')
    err.code = 40400
    throw err
  }

  const [p1, p2] = sortParticipantIds(userId, receiverId)
  let conversation = await Conversation.findOne({
    participants: { $all: [p1, p2], $size: 2 },
  })

  if (!conversation) {
    const counts = new Map()
    counts.set(p1.toString(), 0)
    counts.set(p2.toString(), 0)
    conversation = await Conversation.create({
      participants: [p1, p2],
      productId: productId || null,
      unreadCounts: counts,
      lastMessage: { content: '', type: 'text' },
    })
  } else if (productId && !conversation.productId) {
    conversation.productId = productId
    await conversation.save()
  }

  return conversation.populate([
    { path: 'participants', select: 'nickname avatar role' },
    { path: 'productId', select: 'title images price status' },
  ])
}

export async function listConversations(userId) {
  const list = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate('participants', 'nickname avatar role')
    .populate('productId', 'title images price')

  return list.map((conv) => formatConversationForUser(conv, userId))
}

export async function getConversationById(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'nickname avatar role')
    .populate('productId', 'title images price')
  if (!conversation) {
    const err = new Error('会话不存在')
    err.code = 40400
    throw err
  }
  const access = validateConversationParticipant(conversation.participants, userId)
  if (!access.ok) {
    const err = new Error(access.message)
    err.code = access.code
    throw err
  }
  return formatConversationForUser(conversation, userId)
}

export async function listMessages(conversationId, userId, query = {}) {
  const conversation = await Conversation.findById(conversationId)
  if (!conversation) {
    const err = new Error('会话不存在')
    err.code = 40400
    throw err
  }
  const access = validateConversationParticipant(conversation.participants, userId)
  if (!access.ok) {
    const err = new Error(access.message)
    err.code = access.code
    throw err
  }

  const { page, pageSize, skip } = parsePagination(query, { defaultPageSize: 30, maxPageSize: 50 })
  const [list, total] = await Promise.all([
    Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('senderId', 'nickname avatar')
      .lean(),
    Message.countDocuments({ conversationId }),
  ])

  return {
    list: list.reverse(),
    pagination: paginationMeta(page, pageSize, total),
  }
}

export async function sendMessage({ conversationId, senderId, type = 'text', content }) {
  const contentCheck = validateMessageContent(content, type, MAX_MESSAGE_CONTENT_LENGTH)
  if (!contentCheck.ok) {
    const err = new Error(contentCheck.message)
    err.code = contentCheck.code
    throw err
  }

  const conversation = await Conversation.findById(conversationId)
  if (!conversation) {
    const err = new Error('会话不存在')
    err.code = 40400
    throw err
  }
  const sendCheck = validateConversationParticipant(conversation.participants, senderId, {
    forbiddenMessage: '无权发送',
  })
  if (!sendCheck.ok) {
    const err = new Error(sendCheck.message)
    err.code = sendCheck.code
    throw err
  }

  const receiverId = conversation.participants.find((p) => p.toString() !== senderId.toString())

  const message = await Message.create({
    conversationId,
    senderId,
    receiverId,
    type,
    content,
  })

  const preview = buildLastMessagePreview(type, content)
  conversation.lastMessage = {
    ...preview,
    senderId,
    createdAt: message.createdAt,
  }
  const rid = receiverId.toString()
  const current = conversation.unreadCounts.get(rid) || 0
  conversation.unreadCounts.set(rid, current + 1)
  conversation.markModified('unreadCounts')
  await conversation.save()

  const populated = await Message.findById(message._id).populate('senderId', 'nickname avatar')

  const payload = {
    message: populated,
    conversationId: conversation._id,
  }

  connectionManager.sendToUser(receiverId, WS_EVENTS.MESSAGE_RECEIVE, payload)
  connectionManager.sendToUser(senderId, WS_EVENTS.MESSAGE_RECEIVE, payload)

  if (!connectionManager.isOnline(receiverId)) {
    await Notification.create({
      userId: receiverId,
      type: 'new_message',
      title: '新消息',
      content: type === 'image' ? '[图片]' : content.slice(0, 50),
      relatedId: conversation._id,
    })
    connectionManager.sendToUser(receiverId, WS_EVENTS.NOTIFICATION, { type: 'new_message' })
  }

  return populated
}

export async function markConversationRead(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId)
  if (!conversation) {
    const err = new Error('会话不存在')
    err.code = 40400
    throw err
  }
  const access = validateConversationParticipant(conversation.participants, userId, {
    forbiddenMessage: '无权操作',
  })
  if (!access.ok) {
    const err = new Error(access.message)
    err.code = access.code
    throw err
  }

  const toMark = await Message.find({
    conversationId,
    receiverId: userId,
    read: false,
  }).select('_id senderId')

  const readAt = new Date()
  const messageIds = toMark.map((m) => m._id)

  if (messageIds.length) {
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { read: true, readAt }
    )
  }

  conversation.unreadCounts.set(userId.toString(), 0)
  conversation.markModified('unreadCounts')
  await conversation.save()

  const peerId = conversation.participants.find((p) => p.toString() !== userId.toString())
  connectionManager.sendToUser(peerId, WS_EVENTS.MESSAGE_READ, {
    conversationId,
    readerId: userId,
    readAt,
    messageIds: messageIds.map((id) => id.toString()),
  })

  return { conversation, messageIds, readAt }
}

export async function getUnreadMessageCount(userId) {
  const convs = await Conversation.find({ participants: userId })
  return sumUnreadCounts(convs, userId)
}

export async function getPeerId(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId)
  if (!conversation) return null
  const peer = conversation.participants.find((p) => p.toString() !== userId.toString())
  return peer || null
}

export async function contactSeller(buyerId, productId) {
  const product = await Product.findById(productId)
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  const contactCheck = validateContactSeller(buyerId, product.sellerId)
  if (!contactCheck.ok) {
    const err = new Error(contactCheck.message)
    err.code = contactCheck.code
    throw err
  }
  return getOrCreateConversation(buyerId, product.sellerId, productId)
}
