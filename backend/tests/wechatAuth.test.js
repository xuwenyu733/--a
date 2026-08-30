import { describe, it, expect } from 'vitest'
import { code2Session, syntheticPhoneFromOpenId } from '../src/services/wechatService.js'

describe('wechat auth', () => {
  it('sandbox code2Session returns stable openid', async () => {
    const a = await code2Session('test-code-abc')
    const b = await code2Session('test-code-abc')
    expect(a.openid).toBe(b.openid)
    expect(a.openid).toMatch(/^sandbox_/)
  })

  it('different codes produce different openids', async () => {
    const a = await code2Session('code-a')
    const b = await code2Session('code-b')
    expect(a.openid).not.toBe(b.openid)
  })

  it('syntheticPhoneFromOpenId is stable', () => {
    expect(syntheticPhoneFromOpenId('sandbox_abc')).toBe(syntheticPhoneFromOpenId('sandbox_abc'))
  })

  it('syntheticPhoneFromOpenId matches phone pattern', () => {
    const phone = syntheticPhoneFromOpenId('sandbox_abc123')
    expect(phone).toMatch(/^1\d{10}$/)
  })
})
