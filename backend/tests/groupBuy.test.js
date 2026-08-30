import { describe, it, expect } from 'vitest'
import { normalizeGroupBuyInput, getGroupBuySummary } from '../src/services/groupBuyService.js'

describe('groupBuyService', () => {
  it('normalizeGroupBuyInput rejects group price >= price', () => {
    expect(() => normalizeGroupBuyInput({ enabled: true, minCount: 2, groupPrice: 50 }, 50)).toThrow(
      '拼单价须低于原价'
    )
  })

  it('normalizeGroupBuyInput returns disabled when not enabled', () => {
    const gb = normalizeGroupBuyInput({ enabled: false }, 100)
    expect(gb.enabled).toBe(false)
    expect(gb.participants).toEqual([])
  })

  it('getGroupBuySummary computes remaining slots', () => {
    const product = {
      groupBuy: {
        enabled: true,
        minCount: 3,
        groupPrice: 8,
        status: 'open',
        participants: [{ userId: 'u1' }, { userId: 'u2' }],
      },
    }
    const s = getGroupBuySummary(product, 'u1')
    expect(s.participantCount).toBe(2)
    expect(s.remaining).toBe(1)
    expect(s.joined).toBe(true)
    expect(s.isFull).toBe(false)
  })
})
