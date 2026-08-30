import { describe, it, expect, vi } from 'vitest'
import { success, fail, ErrorCodes } from '../src/utils/response.js'

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    json(payload) {
      this.body = payload
      return this
    },
    status(code) {
      this.statusCode = code
      return this
    },
  }
  return res
}

describe('success', () => {
  it('returns code 0 with resolved data', () => {
    const res = mockRes()
    success(res, { avatar: '/uploads/a.jpg' })
    expect(res.body).toEqual({
      code: 0,
      message: 'ok',
      data: { avatar: expect.stringContaining('/uploads/a.jpg') },
    })
  })
})

describe('fail', () => {
  it('sets status and error payload', () => {
    const res = mockRes()
    fail(res, ErrorCodes.NOT_FOUND, '未找到', 404)
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ code: 40400, message: '未找到', data: null })
  })
})

describe('ErrorCodes', () => {
  it('exposes stable numeric codes', () => {
    expect(ErrorCodes.UNAUTHORIZED).toBe(40100)
    expect(ErrorCodes.LOGIN_FAILED).toBe(40102)
    expect(ErrorCodes.SERVER_ERROR).toBe(50000)
  })
})
