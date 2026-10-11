import { describe, it, expect } from 'vitest'
import { __test, isTencentSmsReady } from '../src/services/tencentSms.js'

describe('tencentSms', () => {
  it('isTencentSmsReady requires all fields', () => {
    expect(isTencentSmsReady({})).toBe(false)
    expect(
      isTencentSmsReady({
        provider: 'tencent',
        secretId: 'id',
        secretKey: 'key',
        sdkAppId: '140000',
        signName: '码间',
        templateId: '123456',
      })
    ).toBe(true)
  })

  it('buildAuthorization returns TC3 header', () => {
    const timestamp = 1700000000
    const auth = __test.buildAuthorization({
      secretId: 'AKIDtest',
      secretKey: 'secret',
      host: 'sms.tencentcloudapi.com',
      service: 'sms',
      action: 'SendSms',
      payload: '{"PhoneNumberSet":["+8613800000000"]}',
      timestamp,
    })
    expect(auth).toMatch(/^TC3-HMAC-SHA256 Credential=AKIDtest\//)
    expect(auth).toContain('SignedHeaders=content-type;host;x-tc-action')
    expect(auth).toContain('Signature=')
  })
})
