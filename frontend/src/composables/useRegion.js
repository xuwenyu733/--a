import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'

const GUEST_REGION_KEY = 'guest_region_id'

export function useRegion() {
  const auth = useAuthStore()

  const regionId = computed(() => {
    if (auth.user?.regionId) {
      const r = auth.user.regionId
      return typeof r === 'object' ? r._id : r
    }
    return localStorage.getItem(GUEST_REGION_KEY) || ''
  })

  function setGuestRegion(id) {
    localStorage.setItem(GUEST_REGION_KEY, id)
  }

  async function ensureGuestRegion() {
    if (regionId.value) return regionId.value
    const regions = await authApi.getRegions()
    if (!regions.length) return ''
    const stored = localStorage.getItem(GUEST_REGION_KEY)
    if (stored && regions.some((r) => r._id === stored)) return stored
    setGuestRegion(regions[0]._id)
    return regions[0]._id
  }

  return { regionId, setGuestRegion, ensureGuestRegion }
}
