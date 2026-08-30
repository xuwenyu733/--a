import MerchantProfile from '../models/MerchantProfile.js'
import * as merchantService from '../services/merchantService.js'
import * as productService from '../services/productService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

export async function getMyShop(req, res, next) {
  try {
    const shop = await MerchantProfile.findOne({ userId: req.user._id })
    if (!shop) return fail(res, ErrorCodes.NOT_FOUND, '店铺不存在', 404)
    return success(res, shop)
  } catch (err) {
    next(err)
  }
}

export async function updateMyShop(req, res, next) {
  try {
    const shop = await MerchantProfile.findOneAndUpdate(
      { userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!shop) return fail(res, ErrorCodes.NOT_FOUND, '店铺不存在', 404)
    return success(res, shop, '更新成功')
  } catch (err) {
    next(err)
  }
}

export async function getPublicShop(req, res, next) {
  try {
    const shop = await MerchantProfile.findOne({ userId: req.params.userId, status: 'active' })
    if (!shop) return fail(res, ErrorCodes.NOT_FOUND, '店铺不存在', 404)
    const User = (await import('../models/User.js')).default
    const user = await User.findById(req.params.userId).select('nickname avatar role studentVerified')
    const query = req.validatedQuery || req.query
    const products = await productService.listProducts({
      regionId: shop.regionId,
      sellerId: req.params.userId,
      page: query.page || 1,
      pageSize: query.pageSize || 12,
    })
    return success(res, { shop, user, products })
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await merchantService.getMerchantStats(req.user._id)
    return success(res, stats)
  } catch (err) {
    next(err)
  }
}
