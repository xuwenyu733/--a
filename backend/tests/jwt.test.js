import { describe, it, expect } from 'vitest'
import { buildTokenPayload } from '../src/utils/jwt.js'

describe('buildTokenPayload', () => {
  it('maps user id, role and region', () => {
    expect(
      buildTokenPayload({
        _id: { toString: () => 'user123' },
        role: 'student',
        regionId: { toString: () => 'region456' },
      })
    ).toEqual({
      userId: 'user123',
      role: 'student',
      regionId: 'region456',
    })
  })

  it('allows null regionId', () => {
    expect(
      buildTokenPayload({
        _id: 'uid',
        role: 'admin',
        regionId: null,
      })
    ).toEqual({
      userId: 'uid',
      role: 'admin',
      regionId: null,
    })
  })
})
