import {
  MAX_DELIVERY_PRESETS,
  normalizePresets,
  storageKeyForUser,
} from '../../shared/deliveryPresetsCore.js'

export { MAX_DELIVERY_PRESETS, applyPresetToForm, buildPreset, canSaveAsPreset, renamePreset } from '../../shared/deliveryPresetsCore.js'

export function loadDeliveryPresets(userId) {
  try {
    const raw = uni.getStorageSync(storageKeyForUser(userId))
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return normalizePresets(parsed)
  } catch {
    return []
  }
}

export function saveDeliveryPresets(userId, presets) {
  const normalized = normalizePresets(presets)
  uni.setStorageSync(storageKeyForUser(userId), JSON.stringify(normalized))
  return normalized
}
