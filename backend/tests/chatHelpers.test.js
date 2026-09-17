import { describe, it, expect } from 'vitest'
import {
  sortParticipantIds,
  validateSelfChat,
  validateMessageContent,
  buildLastMessagePreview,
  sumUnreadCounts,
} from '../src/utils/chatHelpers.js'

describe('chatHelpers', () => {
  it('sortParticipantIds orders consistently', () => {
    const [a, b] = sortParticipantIds('u2', 'u1')
    expect(a.toString()).toBe('u1')
    expect(b.toString()).toBe('u2')
  })

  it('validateSelfChat rejects same user', () => {
    const r = validateSelfChat('u1', 'u1')
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40000)
  })

  it('validateMessageContent allows platform image url', () => {
    expect(validateMessageContent('/uploads/a.jpg', 'image').ok).toBe(true)
  })

  it('validateMessageContent rejects external image url', () => {
    const r = validateMessageContent('https://evil.example/x.png', 'image')
    expect(r.ok).toBe(false)
    expect(r.code).toBe(40000)
  })

  it('buildLastMessagePreview for image', () => {
    expect(buildLastMessagePreview('image', 'ignored')).toEqual({
      content: '[图片]',
      type: 'image',
    })
  })

  it('sumUnreadCounts from Map', () => {
    const map = new Map([['u1', 2], ['u2', 1]])
    const total = sumUnreadCounts([{ unreadCounts: map }], 'u1')
    expect(total).toBe(2)
  })
})
