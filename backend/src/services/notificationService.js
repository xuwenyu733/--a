import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { connectionManager } from '../websocket/connectionManager.js'
import { WS_EVENTS } from '../constants/wsEvents.js'
import { sendNotificationEmail } from './emailService.js'
import logger from '../utils/logger.js'

/**
 * 创建站内通知并尝试 WebSocket 推送
 */
export async function notifyUser(userId, { type, title, content, relatedId }) {
  if (!userId) return null
  const doc = await Notification.create({
    userId,
    type,
    title,
    content: content || '',
    relatedId: relatedId || null,
  })
  connectionManager.sendToUser(userId.toString(), WS_EVENTS.NOTIFICATION, {
    type,
    title,
    content: content || '',
    relatedId,
  })

  if (!connectionManager.isOnline(userId.toString())) {
    User.findById(userId)
      .select('email nickname')
      .lean()
      .then((user) => {
        if (user?.email) {
          sendNotificationEmail(user, { title, content }).catch((err) => {
            logger.warn('sendNotificationEmail failed', { userId, err: err?.message })
          })
        }
      })
      .catch((err) => {
        logger.warn('notifyUser email lookup failed', { userId, err: err?.message })
      })
  }

  return doc
}
