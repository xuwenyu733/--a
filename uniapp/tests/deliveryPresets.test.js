import { describe, expect, it } from 'vitest'
import {
  MAX_DELIVERY_PRESETS,
  applyPresetToForm,
  buildPreset,
  canSaveAsPreset,
  normalizePresets,
  renamePreset,
} from '../../shared/deliveryPresetsCore.js'

describe('deliveryPresetsCore', () => {
  const sampleForm = {
    type: 'food',
    zoneId: 'zone1',
    title: '南门取外卖',
    pickupAddress: '南门外卖柜',
    dropoffAddress: '1号公寓302',
    contactPhone: '13800000003',
    fee: '5',
    description: '美团',
    remark: '',
  }

  it('canSaveAsPreset requires pickup and dropoff', () => {
    expect(canSaveAsPreset(sampleForm)).toBe(true)
    expect(canSaveAsPreset({ pickupAddress: 'a' })).toBe(false)
  })

  it('applyPresetToForm keeps contactPhone', () => {
    const preset = buildPreset('取外卖', sampleForm, 'p1')
    const next = applyPresetToForm(preset, sampleForm)
    expect(next.pickupAddress).toBe('南门外卖柜')
    expect(next.contactPhone).toBe('13800000003')
  })

  it('normalizePresets caps at max', () => {
    const raw = [
      { id: '1', name: 'A', pickupAddress: 'p', dropoffAddress: 'd' },
      { id: '2', name: 'B', pickupAddress: 'p', dropoffAddress: 'd' },
      { id: '3', name: 'C', pickupAddress: 'p', dropoffAddress: 'd' },
      { id: '4', name: 'D', pickupAddress: 'p', dropoffAddress: 'd' },
    ]
    expect(normalizePresets(raw, MAX_DELIVERY_PRESETS)).toHaveLength(3)
  })

  it('renamePreset updates name', () => {
    const presets = [buildPreset('旧名', sampleForm, 'p1')]
    const next = renamePreset(presets, 'p1', '取外卖')
    expect(next[0].name).toBe('取外卖')
  })
})
