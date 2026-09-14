import Product from '../models/Product.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { activeProductFilter } from '../utils/productQuery.js'
import { cacheGet, cacheSet } from '../utils/cache.js'

const REC_CACHE_TTL = Number(process.env.RECOMMEND_CACHE_TTL) || 120
const NEW_LISTING_DAYS = 7
const NEW_LISTING_BOOST = 10
const SELLER_FIELDS = 'nickname avatar role studentVerified creditScore'
const MAX_LIMIT = 20

export function recommendationScore(product, now = Date.now()) {
  const fav = product.favoriteCount || 0
  const views = product.viewCount || 0
  const created = product.createdAt ? new Date(product.createdAt).getTime() : 0
  const isNew = created > now - NEW_LISTING_DAYS * 86400000
  return fav * 2 + views + (isNew ? NEW_LISTING_BOOST : 0)
}

export function sortByRecommendationScore(items, now = Date.now()) {
  return [...items].sort((a, b) => recommendationScore(b, now) - recommendationScore(a, now))
}

export function buildRecCacheKey({ regionId, productId, limit, userId }) {
  return `rec:${regionId}:${productId || 'hot'}:${userId || 'guest'}:${limit}`
}

/** 去重合并推荐候选（排除本人商品与当前详情页商品） */
export function mergeRecommendationItems(collected, seen, items, { cap, excludeIds = [] }) {
  for (const item of items) {
    if (collected.length >= cap) break
    const id = item._id?.toString?.() || String(item._id)
    if (excludeIds.includes(id) || seen.has(id)) continue
    seen.add(id)
    collected.push(item)
  }
  return collected
}

export async function getRecommendations({ regionId, productId, limit = 8, userId }) {
  const rid = regionId?._id?.toString?.() || regionId?.toString?.() || regionId
  if (!rid) {
    const err = new Error('请指定 regionId')
    err.code = 40000
    throw err
  }

  const cap = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || 8))
  const cacheKey = buildRecCacheKey({
    regionId: rid,
    productId: productId?.toString?.() || productId,
    limit: cap,
    userId: userId?.toString?.() || userId,
  })
  const cached = await cacheGet(cacheKey)
  if (cached) return cached

  const baseFilter = activeProductFilter({ regionId: rid, status: PRODUCT_STATUS.ON_SALE })
  const excludeIds = []
  if (productId) excludeIds.push(productId.toString())
  if (userId) {
    const mine = await Product.find(activeProductFilter({ sellerId: userId, regionId: rid }))
      .select('_id')
      .lean()
    mine.forEach((p) => excludeIds.push(p._id.toString()))
  }

  const relatedPromise = productId
    ? Product.findOne(activeProductFilter({ _id: productId }))
        .select('category')
        .lean()
        .then((p) => {
          if (!p) return []
          return Product.find({
            ...baseFilter,
            category: p.category,
            _id: { $ne: productId },
          })
            .sort({ createdAt: -1 })
            .limit(cap)
            .populate('sellerId', SELLER_FIELDS)
            .select('-description -stock')
            .lean()
        })
    : Promise.resolve([])

  const [hot, recent, related] = await Promise.all([
    Product.find(baseFilter)
      .sort({ favoriteCount: -1, viewCount: -1, createdAt: -1 })
      .limit(cap * 2)
      .populate('sellerId', SELLER_FIELDS)
      .select('-description -stock')
      .lean(),
    Product.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(cap)
      .populate('sellerId', SELLER_FIELDS)
      .select('-description -stock')
      .lean(),
    relatedPromise,
  ])

  const seen = new Set()
  const collected = []
  mergeRecommendationItems(collected, seen, sortByRecommendationScore(hot), { cap, excludeIds })
  mergeRecommendationItems(collected, seen, recent, { cap, excludeIds })
  mergeRecommendationItems(collected, seen, related, { cap, excludeIds })

  const result = { list: collected.slice(0, cap) }
  await cacheSet(cacheKey, result, REC_CACHE_TTL)
  return result
}
