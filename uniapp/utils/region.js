const GUEST_REGION_KEY = 'guest_region_id'
import { request } from './request'
import { getUser } from './auth'

export function getRegionId() {
  const user = getUser()
  if (user?.regionId) {
    return typeof user.regionId === 'object' ? user.regionId._id : user.regionId
  }
  return uni.getStorageSync(GUEST_REGION_KEY) || ''
}

export function setGuestRegion(id) {
  uni.setStorageSync(GUEST_REGION_KEY, id)
}

export async function ensureGuestRegion() {
  try {
    const regions = await request({ url: '/regions', timeout: 10000 })
    if (!regions?.length) return ''
    // 已登录用户所属区域优先，但必须在当前后端区域列表里（避免换库/换服务器后旧 id 查空）
    const current = getRegionId()
    if (current && regions.some((r) => r._id === current)) return current
    const stored = uni.getStorageSync(GUEST_REGION_KEY)
    if (stored && regions.some((r) => r._id === stored)) return stored
    setGuestRegion(regions[0]._id)
    return regions[0]._id
  } catch {
    return getRegionId() || ''
  }
}
