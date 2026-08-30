import crypto from 'crypto'
import logger from '../utils/logger.js'

const CHANNEL = process.env.WS_REDIS_CHANNEL || 'campus:ws:push'
const INSTANCE_ID = crypto.randomUUID()

let publisher = null
let subscriber = null
let enabled = false
/** @type {((userId: string, event: string, data: unknown) => void) | null} */
let localDeliver = null

/**
 * 跨实例 WebSocket 推送：配置 REDIS_URL 后 Pub/Sub，否则仅本机内存。
 * @param {(userId: string, event: string, data: unknown) => void} deliverLocally
 */
export async function initRedisBridge(deliverLocally) {
  localDeliver = deliverLocally
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    logger.info('未配置 REDIS_URL，WebSocket 仅本机推送')
    return false
  }

  try {
    const { createClient } = await import('redis')
    publisher = createClient({ url })
    subscriber = createClient({ url })
    publisher.on('error', () => {})
    subscriber.on('error', () => {})
    await publisher.connect()
    await subscriber.connect()

    await subscriber.subscribe(CHANNEL, (message) => {
      try {
        const pkt = JSON.parse(message)
        if (pkt.from === INSTANCE_ID) return
        if (pkt.userId && localDeliver) {
          localDeliver(String(pkt.userId), pkt.event, pkt.data)
        }
      } catch {
        /* ignore malformed packet */
      }
    })

    enabled = true
    logger.info(`WebSocket Redis 桥接已启用 (${CHANNEL})`)
    return true
  } catch (err) {
    logger.warn(`Redis 桥接启动失败，降级为本机推送: ${err.message}`)
    enabled = false
    publisher = null
    subscriber = null
    return false
  }
}

export async function publishWsToCluster(userId, event, data) {
  if (!enabled || !publisher) return
  try {
    await publisher.publish(
      CHANNEL,
      JSON.stringify({
        from: INSTANCE_ID,
        userId: String(userId),
        event,
        data,
      })
    )
  } catch (err) {
    logger.warn(`Redis publish 失败: ${err.message}`)
  }
}

export async function closeRedisBridge() {
  enabled = false
  localDeliver = null
  try {
    if (subscriber) await subscriber.quit()
    if (publisher) await publisher.quit()
  } catch {
    /* noop */
  }
  subscriber = null
  publisher = null
}

export function isRedisBridgeEnabled() {
  return enabled
}
