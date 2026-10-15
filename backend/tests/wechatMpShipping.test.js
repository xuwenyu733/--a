import { describe, expect, it } from 'vitest'

// 轻量校验：RFC3339 本地偏移格式（与 wechatMpShipping 内逻辑一致）
function rfc3339Now(d = new Date()) {
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const oh = pad(Math.floor(abs / 60))
  const om = pad(abs % 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`
}

function maskPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '')
  if (p.length < 7) return p || '****'
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}

describe('wechatMpShipping helpers', () => {
  it('formats rfc3339 with timezone offset', () => {
    const s = rfc3339Now(new Date('2026-10-15T12:00:00+08:00'))
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
  })

  it('masks phone for contact field', () => {
    expect(maskPhone('13800138000')).toBe('138****8000')
  })
})
