import { describe, it, expect } from 'vitest'
import { parsePagination, paginationMeta } from '../src/utils/pagination.js'

describe('parsePagination', () => {
  it('uses defaults', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20, skip: 0 })
  })

  it('computes skip from page', () => {
    expect(parsePagination({ page: 3, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
    })
  })

  it('caps pageSize at max', () => {
    const r = parsePagination({ pageSize: 999 })
    expect(r.pageSize).toBe(50)
  })

  it('respects custom maxPageSize', () => {
    const r = parsePagination({ pageSize: 100 }, { maxPageSize: 10 })
    expect(r.pageSize).toBe(10)
  })
})

describe('paginationMeta', () => {
  it('returns page info', () => {
    expect(paginationMeta(2, 10, 35)).toEqual({ page: 2, pageSize: 10, total: 35 })
  })
})
