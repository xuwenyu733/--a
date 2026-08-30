import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  initRedisBridge,
  closeRedisBridge,
  publishWsToCluster,
  isRedisBridgeEnabled,
} from '../src/websocket/redisBridge.js'

describe('redisBridge', () => {
  const origRedisUrl = process.env.REDIS_URL

  beforeEach(async () => {
    delete process.env.REDIS_URL
    await closeRedisBridge()
  })

  afterEach(async () => {
    await closeRedisBridge()
    if (origRedisUrl !== undefined) process.env.REDIS_URL = origRedisUrl
    else delete process.env.REDIS_URL
  })

  it('initRedisBridge returns false without REDIS_URL', async () => {
    const ok = await initRedisBridge(() => {})
    expect(ok).toBe(false)
    expect(isRedisBridgeEnabled()).toBe(false)
  })

  it('publishWsToCluster is no-op when bridge disabled', async () => {
    let delivered = 0
    await initRedisBridge(() => {
      delivered += 1
    })
    await publishWsToCluster('user1', 'ping', {})
    expect(delivered).toBe(0)
    expect(isRedisBridgeEnabled()).toBe(false)
  })

  it('closeRedisBridge resets state', async () => {
    await initRedisBridge(() => {})
    await closeRedisBridge()
    expect(isRedisBridgeEnabled()).toBe(false)
  })
})
