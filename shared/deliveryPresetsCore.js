export const MAX_DELIVERY_PRESETS = 3

export function createPresetId() {
  return `dp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** @param {Record<string, unknown>} form */
export function extractPresetFields(form) {
  return {
    type: form.type || 'food',
    zoneId: form.zoneId || '',
    title: String(form.title || '').trim(),
    pickupAddress: String(form.pickupAddress || '').trim(),
    dropoffAddress: String(form.dropoffAddress || '').trim(),
    fee: String(form.fee ?? '5'),
    description: String(form.description || '').trim(),
    remark: String(form.remark || '').trim(),
  }
}

/** @param {Record<string, unknown>} form */
export function canSaveAsPreset(form) {
  return !!(String(form.pickupAddress || '').trim() && String(form.dropoffAddress || '').trim())
}

/**
 * @param {unknown} raw
 * @param {number} [max]
 */
export function normalizePresets(raw, max = MAX_DELIVERY_PRESETS) {
  if (!Array.isArray(raw)) return []
  const list = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const fields = extractPresetFields(item)
    const name = String(item.name || '').trim()
    if (!name || !fields.pickupAddress || !fields.dropoffAddress) continue
    list.push({
      id: String(item.id || createPresetId()),
      name: name.slice(0, 20),
      ...fields,
    })
    if (list.length >= max) break
  }
  return list
}

/**
 * @param {Record<string, unknown>} preset
 * @param {Record<string, unknown>} currentForm
 */
export function applyPresetToForm(preset, currentForm) {
  const fields = extractPresetFields(preset)
  return {
    ...currentForm,
    ...fields,
  }
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} form
 * @param {string} [id]
 */
export function buildPreset(name, form, id) {
  const trimmed = String(name || '').trim()
  if (!trimmed) {
    throw new Error('请填写预设名称')
  }
  const fields = extractPresetFields(form)
  if (!fields.pickupAddress || !fields.dropoffAddress) {
    throw new Error('请先填写取件和送达地址')
  }
  return {
    id: id || createPresetId(),
    name: trimmed.slice(0, 20),
    ...fields,
  }
}

/**
 * @param {Array<{ id: string }>} presets
 * @param {string} presetId
 * @param {string} name
 */
export function renamePreset(presets, presetId, name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) throw new Error('请填写预设名称')
  const idx = presets.findIndex((p) => p.id === presetId)
  if (idx < 0) throw new Error('预设不存在')
  const next = presets.slice()
  next[idx] = { ...next[idx], name: trimmed.slice(0, 20) }
  return next
}

export function storageKeyForUser(userId) {
  return `delivery_presets_${userId || 'guest'}`
}
