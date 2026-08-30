import { WebSocketServer } from 'ws'
import { verifyAccessToken } from '../utils/jwt.js'
import { connectionManager } from './connectionManager.js'
import * as chatService from '../services/chatService.js'
import { WS_EVENTS } from '../constants/wsEvents.js'
import logger from '../utils/logger.js'

const MAX_WS_PAYLOAD = 64 * 1024
const MAX_MESSAGE_CONTENT_LENGTH = 5000

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    let userId = null
    let authed = false

    ws.on('message', async (raw) => {
      try {
        const rawStr = raw.toString()
        if (rawStr.length > MAX_WS_PAYLOAD) {
          ws.send(JSON.stringify({ event: WS_EVENTS.ERROR, data: { message: '消息体过大' } }))
          return
        }
        const msg = JSON.parse(rawStr)
        const { event, data } = msg

        if (event === WS_EVENTS.PING) {
          ws.send(JSON.stringify({ event: WS_EVENTS.PONG, data: {} }))
          return
        }

        if (event === WS_EVENTS.AUTH) {
          const decoded = verifyAccessToken(data.token)
          userId = decoded.userId
          authed = true
          connectionManager.add(userId, ws)
          ws.send(JSON.stringify({ event: WS_EVENTS.AUTH_OK, data: { userId } }))
          return
        }

        if (!authed) {
          ws.send(JSON.stringify({ event: WS_EVENTS.ERROR, data: { message: '请先认证' } }))
          return
        }

        if (event === WS_EVENTS.MESSAGE_SEND) {
          const content = data.content ?? ''
          if ((data.type || 'text') === 'text' && content.length > MAX_MESSAGE_CONTENT_LENGTH) {
            ws.send(JSON.stringify({
              event: WS_EVENTS.ERROR,
              data: { message: `消息内容不能超过 ${MAX_MESSAGE_CONTENT_LENGTH} 字` },
            }))
            return
          }
          const message = await chatService.sendMessage({
            conversationId: data.conversationId,
            senderId: userId,
            type: data.type || 'text',
            content,
          })
          ws.send(JSON.stringify({ event: WS_EVENTS.MESSAGE_SEND_OK, data: { message } }))
          return
        }

        if (event === WS_EVENTS.MESSAGE_READ) {
          await chatService.markConversationRead(data.conversationId, userId)
          ws.send(JSON.stringify({ event: WS_EVENTS.MESSAGE_READ_OK, data: { conversationId: data.conversationId } }))
          return
        }

        if (event === WS_EVENTS.TYPING) {
          const peerId = await chatService.getPeerId(data.conversationId, userId)
          if (peerId) {
            connectionManager.sendToUser(peerId, WS_EVENTS.TYPING, {
              conversationId: data.conversationId,
              userId,
              typing: data.typing,
            })
          }
          return
        }
      } catch (err) {
        ws.send(JSON.stringify({ event: WS_EVENTS.ERROR, data: { message: err.message || '处理失败' } }))
      }
    })

    ws.on('close', () => {
      connectionManager.remove(ws)
    })

    ws.on('error', () => {
      connectionManager.remove(ws)
    })
  })

  logger.info('WebSocket 已启用: ws://localhost/ws')
  return wss
}
