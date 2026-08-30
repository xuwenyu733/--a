import { describe, it, expect } from 'vitest'
import { resolveRouteTitle } from '../src/utils/pageMeta.js'

describe('pageMeta', () => {
  it('resolveRouteTitle uses path map', () => {
    expect(resolveRouteTitle({ path: '/products', meta: {} })).toBe('商品市集')
  })

  it('resolveRouteTitle uses meta.title first', () => {
    expect(resolveRouteTitle({ path: '/products', meta: { title: '自定义' } })).toBe('自定义')
  })

  it('resolveRouteTitle infers product detail', () => {
    expect(resolveRouteTitle({ path: '/products/abc123', meta: {} })).toBe('商品详情')
  })
})
