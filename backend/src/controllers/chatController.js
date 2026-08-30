import * as chatService from '../services/chatService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

export async function listConversations(req, res, next) {
  try {
    const list = await chatService.listConversations(req.user._id)
    return success(res, list)
  } catch (err) {
    next(err)
  }
}

export async function getConversation(req, res, next) {
  try {
    const conv = await chatService.getConversationById(req.params.id, req.user._id)
    return success(res, conv)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function createConversation(req, res, next) {
  try {
    const { receiverId, productId } = req.body
    const conversation = await chatService.getOrCreateConversation(
      req.user._id,
      receiverId,
      productId || null
    )
    return success(res, chatService.formatConversationForUser(conversation, req.user._id))
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function contactSeller(req, res, next) {
  try {
    const { productId } = req.body
    const conversation = await chatService.contactSeller(req.user._id, productId)
    const formatted = {
      ...(conversation.toObject?.() || conversation),
      peer: conversation.participants?.find((p) => p._id.toString() !== req.user._id.toString()),
      unreadCount: 0,
    }
    return success(res, formatted)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function listMessages(req, res, next) {
  try {
    const data = await chatService.listMessages(req.params.id, req.user._id, req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function markRead(req, res, next) {
  try {
    const result = await chatService.markConversationRead(req.params.id, req.user._id)
    return success(res, {
      messageIds: result.messageIds?.map((id) => id.toString()) || [],
      readAt: result.readAt,
    }, '已标记已读')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function sendMessageHttp(req, res, next) {
  try {
    const { type = 'text', content } = req.body
    const message = await chatService.sendMessage({
      conversationId: req.params.id,
      senderId: req.user._id,
      type,
      content,
    })
    return success(res, message)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}
