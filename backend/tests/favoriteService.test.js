import { describe, it, expect } from 'vitest'
import { buildFavoriteList } from '../src/services/favoriteService.js'
import { PRODUCT_STATUS } from '../src/constants/product.js'

describe('favoriteService.buildFavoriteList', () => {
  it('marks price drop when product is cheaper', () => {
    const favorites = [{ productId: 'p1', priceAtFavorite: 100 }]
    const products = [{ _id: 'p1', price: 80, status: PRODUCT_STATUS.ON_SALE, title: '键盘' }]
    const list = buildFavoriteList(favorites, products)
    expect(list).toHaveLength(1)
    expect(list[0].priceDrop).toBe(true)
  })

  it('skips missing products', () => {
    const list = buildFavoriteList([{ productId: 'gone' }], [])
    expect(list).toHaveLength(0)
  })
})
