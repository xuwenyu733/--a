import { cacheGet, cacheSet, cacheDel } from '../utils/cache.js'

const PLATFORM_CACHE_KEY = 'config:platform'
const PLATFORM_CACHE_TTL = Number(process.env.PLATFORM_CONFIG_CACHE_TTL) || 60

const DEFAULT_CONFIG = {
  banners: [
    { title: '本校交易 · 当面验货', subtitle: '零手续费，安全可信', image: '', link: '/pages/products/list' },
    { title: '学生认证保障', subtitle: '学号认证，远离诈骗', image: '', link: '/pages/register/register' },
  ],
  announcement: '欢迎使用校园市集，请勿脱离平台交易。',
}

export async function getPublicConfig(SystemConfig) {
  const cached = await cacheGet(PLATFORM_CACHE_KEY)
  if (cached) return cached

  const doc = await SystemConfig.findOne({ key: 'platform' })
  const value = doc?.value || DEFAULT_CONFIG
  await cacheSet(PLATFORM_CACHE_KEY, value, PLATFORM_CACHE_TTL)
  return value
}

export async function updatePlatformConfig(SystemConfig, value) {
  const doc = await SystemConfig.findOneAndUpdate(
    { key: 'platform' },
    { key: 'platform', value },
    { upsert: true, new: true }
  )
  await cacheDel(PLATFORM_CACHE_KEY)
  return doc
}

export { DEFAULT_CONFIG }
