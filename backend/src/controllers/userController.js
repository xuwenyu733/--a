import User from '../models/User.js'
import Product from '../models/Product.js'
import MerchantProfile from '../models/MerchantProfile.js'
import TradeReview from '../models/TradeReview.js'
import { activeProductFilter } from '../utils/productQuery.js'
import * as authService from '../services/authService.js'
import * as verificationService from '../services/verificationService.js'
import * as searchHistoryService from '../services/searchHistoryService.js'
import { ROLES } from '../constants/roles.js'
import { getCreditLevel } from '../constants/credit.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

export async function updateProfile(req, res, next) {
  try {
    const { nickname, gender, bio, email, paymentQrUrl, avatar } = req.body
    const patch = {}
    if (nickname !== undefined) patch.nickname = nickname
    if (gender !== undefined) patch.gender = gender
    if (bio !== undefined) patch.bio = bio
    if (email !== undefined) patch.email = String(email).trim().toLowerCase()
    if (paymentQrUrl !== undefined) patch.paymentQrUrl = paymentQrUrl
    if (avatar !== undefined) patch.avatar = String(avatar).trim().slice(0, 500)
    const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true }).populate(
      'regionId',
      'name code'
    )
    return success(res, authService.sanitizeUser(user, { self: true }))
  } catch (err) {
    next(err)
  }
}

export async function getPublicUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .populate('regionId', 'name code')
      .select('-password -refreshToken')
    if (!user) return fail(res, ErrorCodes.NOT_FOUND, '用户不存在', 404)
    const [productCount, shop, reviewAgg, recentReviews] = await Promise.all([
      Product.countDocuments(activeProductFilter({ sellerId: user._id, status: 'on_sale' })),
      user.role === ROLES.MERCHANT
        ? MerchantProfile.findOne({ userId: user._id, status: 'active' }).select('shopName shopLogo address description')
        : null,
      TradeReview.aggregate([
        { $match: { revieweeId: user._id } },
        { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      ]),
      TradeReview.find({ revieweeId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('reviewerId', 'nickname avatar')
        .lean(),
    ])
    const creditScore = user.creditScore ?? 100
    const reviewStats = reviewAgg[0]
      ? {
          count: reviewAgg[0].count,
          avgRating: Math.round(reviewAgg[0].avgRating * 10) / 10,
        }
      : { count: 0, avgRating: null }

    let relation = { status: 'none' }
    if (req.user) {
      const { getRelationStatus } = await import('../services/friendService.js')
      relation = await getRelationStatus(req.user._id, user._id)
    }

    return success(res, {
      user: authService.sanitizeUser(user, { self: false }),
      productCount,
      shop,
      creditScore,
      creditLevel: getCreditLevel(creditScore),
      reviewStats,
      recentReviews,
      relation: relation.status,
      friendshipId: relation.friendshipId || null,
    })
  } catch (err) {
    next(err)
  }
}

export async function saveSearchHistory(req, res, next) {
  try {
    const { keyword } = req.body
    await searchHistoryService.saveSearch(req.user, keyword)
    return success(res, null, 'ok')
  } catch (err) {
    next(err)
  }
}

export async function listSearchHistory(req, res, next) {
  try {
    const list = await searchHistoryService.listSearchHistory(req.user._id)
    return success(res, list)
  } catch (err) {
    next(err)
  }
}

export async function clearSearchHistory(req, res, next) {
  try {
    await searchHistoryService.clearSearchHistory(req.user._id)
    return success(res, null, '已清空')
  } catch (err) {
    next(err)
  }
}

export async function submitStudentVerify(req, res, next) {
  try {
    const { studentId, realName, enrollYear, college } = req.body
    const verification = await verificationService.submitStudentVerification(req.user, {
      studentId,
      realName,
      enrollYear,
      college: college || '',
    })
    return success(res, verification, '学生认证申请已提交')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function submitMerchantVerify(req, res, next) {
  try {
    const { shopName, businessLicense, contactPhone, address, licenseImage, description } = req.body
    const verification = await verificationService.submitMerchantVerification(req.user, {
      shopName,
      businessLicense: businessLicense || '',
      contactPhone: contactPhone || req.user.phone,
      address: address || '',
      licenseImage: licenseImage || '',
      description: description || '',
    })
    return success(res, verification, '商家入驻申请已提交')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function submitCourierVerify(req, res, next) {
  try {
    const { realName, contactPhone, intro } = req.body
    const verification = await verificationService.submitCourierVerification(req.user, {
      realName: realName.trim(),
      contactPhone: contactPhone || req.user.phone,
      intro: intro || '',
    })
    return success(res, verification, '骑手申请已提交，等待管理员审核')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function getVerifyStatus(req, res, next) {
  try {
    const status = await verificationService.getVerificationStatus(req.user._id)
    return success(res, status)
  } catch (err) {
    next(err)
  }
}
