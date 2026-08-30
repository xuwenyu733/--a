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
  let rid = getRegionId()
  if (rid) return rid
  try {
    const regions = await request({ url: '/regions', timeout: 10000 })
    if (!regions?.length) return ''
    const stored = uni.getStorageSync(GUEST_REGION_KEY)
    if (stored && regions.some((r) => r._id === stored)) return stored
    setGuestRegion(regions[0]._id)
    return regions[0]._id
  } catch {
    return getRegionId() || ''
  }
}
