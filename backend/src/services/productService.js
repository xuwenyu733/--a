import Product from '../models/Product.js'
import Favorite from '../models/Favorite.js'
import User from '../models/User.js'
import MerchantProfile from '../models/MerchantProfile.js'
import { ROLES } from '../constants/roles.js'
import { PRODUCT_STATUS } from '../constants/product.js'
import { parsePagination, paginationMeta } from '../utils/pagination.js'
import logger from '../utils/logger.js'
import { applyProductKeywordFilter, usesTextScore } from '../utils/productSearch.js'
import { activeProductFilter } from '../utils/productQuery.js'
import { notifyUser } from './notificationService.js'
import * as browseHistoryService from './browseHistoryService.js'
import { buildProductSearchText } from '../utils/productPinyin.js'
import { normalizeGroupBuyInput, getGroupBuySummary } from './groupBuyService.js'
export { toggleFavorite, listFavorites } from './favoriteService.js'
export { getRecommendations } from './recommendationService.js'

const PRODUCT_CREATE_FIELDS = [
  'title',
  'description',
  'tradeMode',
  'price',
  'originalPrice',
  'category',
  'images',
  'videos',
  'condition',
  'location',
  'tags',
  'groupBuy',
]

function pickAllowedFields(body, allowed) {
  const safe = {}
  allowed.forEach((k) => {
    if (body[k] !== undefined) safe[k] = body[k]
  })
  return safe
}

/** 发布商品时清洗/补全字段（纯逻辑，便于单测） */
export function prepareProductCreateFields(body) {
  const safeBody = pickAllowedFields(body, PRODUCT_CREATE_FIELDS)
  if (safeBody.tradeMode === 'exchange' && safeBody.price == null) {
    safeBody.price = 0
  }
  if (safeBody.title) {
    safeBody.searchText = buildProductSearchText(safeBody.title)
  }
  const price = safeBody.price ?? 0
  if (safeBody.tradeMode === 'exchange') {
    safeBody.groupBuy = { enabled: false, minCount: 2, groupPrice: 0, status: 'open', participants: [] }
  } else if (safeBody.groupBuy !== undefined) {
    safeBody.groupBuy = normalizeGroupBuyInput(safeBody.groupBuy, price)
  }
  return safeBody
}

export function getSellerType(role) {
  return role === ROLES.MERCHANT ? 'merchant' : 'student'
}

export function canPublish(user) {
  if (user.role === ROLES.MERCHANT) return true
  if (user.role === ROLES.STUDENT && user.studentVerified) return true
  return false
}

export async function listProducts(query, user = null) {
  const {
    regionId,
    keyword,
    category,
    minPrice,
    maxPrice,
    sellerType,
    sellerId,
    tradeMode,
    groupBuyOnly,
    status = PRODUCT_STATUS.ON_SALE,
    sort = 'createdAt',
    order = 'desc',
    page = 1,
    pageSize = 20,
  } = query

  const filter = activeProductFilter({ status })

  const rid = regionId || user?.regionId?.toString()
  if (!rid) {
    const err = new Error('请指定区域 regionId')
    err.code = 40000
    throw err
  }
  filter.regionId = rid

  if (category) filter.category = category
  if (sellerType) filter.sellerType = sellerType
  if (sellerId) filter.sellerId = sellerId
  if (tradeMode) filter.tradeMode = tradeMode
  if (groupBuyOnly === 'true' || groupBuyOnly === true) {
    filter['groupBuy.enabled'] = true
    filter['groupBuy.status'] = 'open'
  }
  if (minPrice != null || maxPrice != null) {
    filter.price = {}
    if (minPrice != null) filter.price.$gte = Number(minPrice)
    if (maxPrice != null) filter.price.$lte = Number(maxPrice)
  }

  let sortOpt = { createdAt: order === 'asc' ? 1 : -1 }
  if (sort === 'price') sortOpt = { price: order === 'asc' ? 1 : -1 }
  if (sort === 'favoriteCount') sortOpt = { favoriteCount: -1, createdAt: -1 }
  if (sort === 'viewCount') sortOpt = { viewCount: -1, createdAt: -1 }

  const { page: p, pageSize: ps, skip } = parsePagination({ page, pageSize })
  const countFilter = { ...filter }
  applyProductKeywordFilter(countFilter, keyword)
  const textSearch = usesTextScore(keyword)

  let q = Product.find(countFilter)
    .sort(textSearch ? { score: { $meta: 'textScore' }, ...sortOpt } : sortOpt)
    .skip(skip)
    .limit(ps)
    .populate('sellerId', 'nickname avatar role studentVerified')
    .select('-description')

  if (textSearch) {
    q = q.select({ score: { $meta: 'textScore' } })
  }

  const [list, total] = await Promise.all([q.lean(), Product.countDocuments(countFilter)])

  return {
    list,
    pagination: paginationMeta(p, ps, total),
  }
}

export async function getProductDetail(id, userId = null) {
  const product = await Product.findOne(activeProductFilter({ _id: id }))
    .populate('sellerId', 'nickname avatar role phone regionId studentVerified merchantProfileId creditScore')
    .populate('regionId', 'name code')

  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }

  await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } })

  const merchantProfileId = product.sellerId?.merchantProfileId
  const [shop, favorited] = await Promise.all([
    product.sellerType === 'merchant' && merchantProfileId
      ? MerchantProfile.findById(merchantProfileId).select('shopName shopLogo status')
      : Promise.resolve(null),
    userId ? Favorite.findOne({ userId, productId: id }).then(Boolean) : Promise.resolve(false),
  ])

  if (userId) {
    browseHistoryService.recordProductBrowse(userId, product).catch((err) => {
      logger.warn('recordProductBrowse failed', { userId, productId: product._id, err: err?.message })
    })
  }

  return { product, shop, favorited, groupBuy: getGroupBuySummary(product, userId) }
}

export async function createProduct(user, body) {
  if (!canPublish(user)) {
    const err = new Error(user.role === ROLES.STUDENT ? '请先完成学生认证' : '无权发布商品')
    err.code = 40301
    throw err
  }
  const safeBody = prepareProductCreateFields(body)
  return Product.create({
    ...safeBody,
    tradeMode: safeBody.tradeMode || 'sell',
    sellerId: user._id,
    regionId: user.regionId,
    sellerType: getSellerType(user.role),
    status: PRODUCT_STATUS.ON_SALE,
  })
}

async function notifyFavoritePriceDrop(product, oldPrice, newPrice) {
  const favorites = await Favorite.find({ productId: product._id }).select('userId')
  const sellerId = product.sellerId.toString()
  const tasks = favorites
    .filter((f) => f.userId.toString() !== sellerId)
    .map((f) =>
      notifyUser(f.userId, {
        type: 'price_drop',
        title: '收藏商品降价了',
        content: `「${product.title}」由 ¥${oldPrice} 降至 ¥${newPrice}`,
        relatedId: product._id,
      })
    )
  await Promise.all(tasks)
  await Favorite.updateMany({ productId: product._id }, { priceAtFavorite: newPrice })
}

export async function updateProduct(productId, user, body) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  if (product.sellerId.toString() !== user._id.toString()) {
    const err = new Error('无权编辑')
    err.code = 40301
    throw err
  }
  const oldPrice = product.price
  const allowed = [
    'title',
    'description',
    'tradeMode',
    'price',
    'originalPrice',
    'category',
    'images',
    'videos',
    'condition',
    'location',
    'tags',
    'groupBuy',
  ]
  const price = body.price !== undefined ? body.price : product.price
  allowed.forEach((k) => {
    if (body[k] !== undefined) product[k] = body[k]
  })
  if (body.groupBuy !== undefined) {
    if (product.tradeMode === 'exchange' || body.tradeMode === 'exchange') {
      product.groupBuy = { enabled: false, minCount: 2, groupPrice: 0, status: 'open', participants: [] }
    } else if (body.groupBuy.enabled === false) {
      product.groupBuy.enabled = false
      product.groupBuy.status = 'open'
      product.groupBuy.participants = []
    } else if (product.groupBuy?.status !== 'success') {
      const participants = product.groupBuy?.participants || []
      product.groupBuy = { ...normalizeGroupBuyInput(body.groupBuy, price), participants }
    }
  }
  if (body.title !== undefined) {
    product.searchText = buildProductSearchText(product.title)
  }
  await product.save()

  if (
    body.price !== undefined &&
    Number(body.price) < oldPrice &&
    product.status === PRODUCT_STATUS.ON_SALE
  ) {
    await notifyFavoritePriceDrop(product, oldPrice, product.price)
  }

  return product
}

export async function updateProductStatus(productId, user, status, isModerator = false) {
  const product = await Product.findById(productId)
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  if (!isModerator && product.sellerId.toString() !== user._id.toString()) {
    const err = new Error('无权操作')
    err.code = 40301
    throw err
  }
  product.status = status
  await product.save()
  return product
}

export async function deleteProduct(productId, user) {
  const product = await Product.findOne(activeProductFilter({ _id: productId }))
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  if (product.sellerId.toString() !== user._id.toString()) {
    const err = new Error('无权删除')
    err.code = 40301
    throw err
  }
  product.deletedAt = new Date()
  product.status = PRODUCT_STATUS.OFF_SHELF
  await product.save()
}

export async function listMyProducts(userId, query) {
  const { status, page = 1, pageSize = 20 } = query
  const filter = activeProductFilter({ sellerId: userId })
  if (status) filter.status = status
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)),
    Product.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}
