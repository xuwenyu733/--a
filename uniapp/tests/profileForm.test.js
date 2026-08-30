import { describe, it, expect } from 'vitest'
import { profileFromUser, profileToUpdatePayload } from '../utils/profileForm.js'

describe('profileFromUser', () => {
  it('maps user fields with defaults', () => {
    expect(profileFromUser({ nickname: '小明', bio: 'hi', email: 'a@b.com' })).toEqual({
      nickname: '小明',
      bio: 'hi',
      email: 'a@b.com',
      paymentQrUrl: '',
      avatar: '',
    })
  })

  it('returns empty form for nullish user', () => {
    expect(profileFromUser(null)).toEqual({
      nickname: '',
      bio: '',
      email: '',
      paymentQrUrl: '',
      avatar: '',
    })
  })
})

describe('profileToUpdatePayload', () => {
  it('trims nickname', () => {
    expect(profileToUpdatePayload({ nickname: '  abc  ', bio: '', email: '', paymentQrUrl: '', avatar: '' })).toEqual({
      nickname: 'abc',
      bio: '',
      email: '',
      paymentQrUrl: '',
      avatar: '',
    })
  })
})
