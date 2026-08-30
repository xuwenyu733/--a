/**
 * 轻量缓存：默认进程内 TTL Map；配置 REDIS_URL 时走 Redis（可选）。
 */

const memory = new Map()

function memGet(key) {
  const entry = memory.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key)
    return null
  }
  return entry.value
}

function memSet(key, value, ttlSeconds) {
  memory.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

function memDel(key) {
  memory.delete(key)
}

let redisClient = null
let redisInitAttempted = false

async function getRedis() {
  if (redisInitAttempted) return redisClient
  redisInitAttempted = true
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null
  try {
    const { createClient } = await import('redis')
    redisClient = createClient({ url })
    redisClient.on('error', () => {})
    await redisClient.connect()
  } catch {
    redisClient = null
  }
  return redisClient
}

export async function cacheGet(key) {
  const redis = await getRedis()
  if (redis) {
    try {
      const raw = await redis.get(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return memGet(key)
    }
  }
  return memGet(key)
}

export async function cacheSet(key, value, ttlSeconds) {
  const redis = await getRedis()
  if (redis) {
    try {
      await redis.setEx(key, ttlSeconds, JSON.stringify(value))
      return
    } catch {
      /* fallback */
    }
  }
  memSet(key, value, ttlSeconds)
}

export async function cacheDel(key) {
  const redis = await getRedis()
  if (redis) {
    try {
      await redis.del(key)
    } catch {
      /* fallback */
    }
  }
  memDel(key)
}

/** 测试用：清空内存缓存 */
export function clearMemoryCache() {
  memory.clear()
}
