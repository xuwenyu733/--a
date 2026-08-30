import { describe, it, expect, beforeEach } from 'vitest'
import { setPublicBaseUrl, getPublicBaseUrl } from '../src/utils/publicBaseUrl.js'

describe('publicBaseUrl', () => {
  beforeEach(() => {
    setPublicBaseUrl('')
  })

  it('stores url without trailing slash', () => {
    setPublicBaseUrl('https://example.com/')
    expect(getPublicBaseUrl()).toBe('https://example.com')
  })

  it('returns empty string when unset', () => {
    expect(getPublicBaseUrl()).toBe('')
  })

  it('accepts empty input', () => {
    setPublicBaseUrl('https://a.com')
    setPublicBaseUrl('')
    expect(getPublicBaseUrl()).toBe('')
  })
})
