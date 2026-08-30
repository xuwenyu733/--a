import { describe, it, expect, vi, beforeEach } from 'vitest'

const getMe = vi.fn()
const getVerifyStatus = vi.fn()
const getUser = vi.fn()
const saveSession = vi.fn()
const getAccessToken = vi.fn()
const getRefreshToken = vi.fn()

vi.mock('@/api/auth', () => ({ getMe }))
vi.mock('@/api/user', () => ({ getVerifyStatus }))
vi.mock('@/utils/auth', () => ({
  getUser,
  saveSession,
  getAccessToken,
  getRefreshToken,
}))

const { refreshUserAndVerify, formatVerifyTime } = await import('../utils/verify.js')

describe('refreshUserAndVerify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAccessToken.mockReturnValue('access')
    getRefreshToken.mockReturnValue('refresh')
  })

  it('uses cached user when getMe fails but returns verifyError when status fails', async () => {
    const cached = { _id: 'u1', nickname: 'cached' }
    getUser.mockReturnValue(cached)
    getMe.mockRejectedValue(new Error('network'))
    getVerifyStatus.mockRejectedValue(new Error('认证状态不可用'))

    const result = await refreshUserAndVerify()

    expect(result.user).toEqual(cached)
    expect(result.status).toBeNull()
    expect(result.verifyError).toBe('认证状态不可用')
    expect(saveSession).not.toHaveBeenCalled()
  })

  it('updates session when getMe succeeds', async () => {
    getUser.mockReturnValue({ _id: 'old' })
    getMe.mockResolvedValue({ user: { _id: 'new', nickname: 'fresh' } })
    getVerifyStatus.mockResolvedValue({ student: { status: 'approved' } })

    const result = await refreshUserAndVerify()

    expect(saveSession).toHaveBeenCalledWith({
      user: { _id: 'new', nickname: 'fresh' },
      accessToken: 'access',
      refreshToken: 'refresh',
    })
    expect(result.user).toEqual({ _id: 'new', nickname: 'fresh' })
    expect(result.verifyError).toBe('')
  })
})

describe('formatVerifyTime', () => {
  it('formats ISO date as YYYY-MM-DD', () => {
    expect(formatVerifyTime('2026-06-08T12:00:00.000Z')).toBe('2026-06-08')
  })

  it('returns empty for falsy input', () => {
    expect(formatVerifyTime('')).toBe('')
    expect(formatVerifyTime(null)).toBe('')
  })
})
