import {
  MAX_DELIVERY_PRESETS,
  normalizePresets,
  storageKeyForUser,
} from '../../../shared/deliveryPresetsCore.js'

export { MAX_DELIVERY_PRESETS, applyPresetToForm, buildPreset, canSaveAsPreset, renamePreset } from '../../../shared/deliveryPresetsCore.js'

export function loadDeliveryPresets(userId) {
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId))
    if (!raw) return []
    return normalizePresets(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveDeliveryPresets(userId, presets) {
  const normalized = normalizePresets(presets)
  localStorage.setItem(storageKeyForUser(userId), JSON.stringify(normalized))
  return normalized
}
