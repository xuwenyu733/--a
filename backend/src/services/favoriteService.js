import Favorite from '../models/Favorite.js'
import Product from '../models/Product.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { activeProductFilter } from '../utils/productQuery.js'
import { parsePagination, paginationMeta } from '../utils/pagination.js'

/** 合并收藏记录与商品，并标记是否降价（纯函数，便于单测） */
export function buildFavoriteList(favorites, products) {
  const productMap = new Map(products.map((p) => [p._id.toString(), p]))
  return favorites
    .map((f) => {
      const product = productMap.get(f.productId.toString())
      if (!product) return null
      const doc = f.toObject ? f.toObject() : { ...f }
      const priceDrop =
        doc.priceAtFavorite != null &&
        product.price < doc.priceAtFavorite &&
        product.status === PRODUCT_STATUS.ON_SALE
      return { ...doc, product, priceDrop }
    })
    .filter(Boolean)
}

export async function toggleFavorite(userId, productId) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }

  const existing = await Favorite.findOne({ userId, productId })
  if (existing) {
    await existing.deleteOne()
    await Product.findByIdAndUpdate(productId, { $inc: { favoriteCount: -1 } })
    return { favorited: false }
  }

  await Favorite.create({ userId, productId, priceAtFavorite: product.price })
  await Product.findByIdAndUpdate(productId, { $inc: { favoriteCount: 1 } })
  return { favorited: true }
}

export async function listFavorites(userId, { page = 1, pageSize = 20 } = {}) {
  const { page: p, pageSize: ps, skip } = parsePagination({ page, pageSize })
  const [favorites, total] = await Promise.all([
    Favorite.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(ps),
    Favorite.countDocuments({ userId }),
  ])

  const productIds = favorites.map((f) => f.productId)
  const products = productIds.length
    ? await Product.find(activeProductFilter({ _id: { $in: productIds } }))
        .populate('sellerId', 'nickname avatar role studentVerified')
        .select('-stock')
        .lean()
    : []

  return {
    list: buildFavoriteList(favorites, products),
    pagination: paginationMeta(p, ps, total),
  }
}
