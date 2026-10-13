import { describe, it, expect } from 'vitest'
import { buildVerifyNotifyPayload } from '../src/services/verificationService.js'

describe('buildVerifyNotifyPayload', () => {
  const base = { _id: 'vid1', type: 'student' }

  it('builds student approved notify', () => {
    const n = buildVerifyNotifyPayload(base, 'approved', '')
    expect(n).toMatchObject({
      type: 'verify_student',
      title: '学生认证已通过',
      relatedId: 'vid1',
    })
    expect(n.content).toContain('学生认证已通过')
  })

  it('builds student rejected notify with reason', () => {
    const n = buildVerifyNotifyPayload(base, 'rejected', '信息不实')
    expect(n.type).toBe('verify_student')
    expect(n.title).toBe('学生认证未通过')
    expect(n.content).toContain('信息不实')
  })

  it('builds merchant and courier payloads', () => {
    expect(buildVerifyNotifyPayload({ _id: 'a', type: 'merchant' }, 'approved').type).toBe(
      'verify_merchant'
    )
    expect(buildVerifyNotifyPayload({ _id: 'b', type: 'courier' }, 'rejected', '').title).toBe(
      '骑手认证未通过'
    )
  })

  it('returns null for unknown status or type', () => {
    expect(buildVerifyNotifyPayload(base, 'pending')).toBeNull()
    expect(buildVerifyNotifyPayload({ _id: 'x', type: 'other' }, 'approved')).toBeNull()
  })
})
