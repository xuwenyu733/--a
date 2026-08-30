import User from '../models/User.js'
import Verification from '../models/Verification.js'
import Region from '../models/Region.js'
import AuditLog from '../models/AuditLog.js'
import Product from '../models/Product.js'
import Report from '../models/Report.js'
import * as productService from '../services/productService.js'
import * as orderService from '../services/orderService.js'
import * as deliveryOrderService from '../services/deliveryOrderService.js'
import * as agentStatsService from '../services/agentStatsService.js'
import * as verificationService from '../services/verificationService.js'
import { createAuditLog } from '../services/auditService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'
import { paginationMeta } from '../utils/pagination.js'

export async function dashboard(req, res, next) {
  try {
    const regionId = req.user.regionId
    const [pendingStudent, pendingMerchant, pendingCourier, userCount, pendingReports, region] =
      await Promise.all([
      Verification.countDocuments({ regionId, type: 'student', status: 'pending' }),
      Verification.countDocuments({ regionId, type: 'merchant', status: 'pending' }),
      Verification.countDocuments({ regionId, type: 'courier', status: 'pending' }),
      User.countDocuments({ regionId, status: 'active' }),
      Report.countDocuments({ regionId, status: 'pending' }),
      Region.findById(regionId),
    ])
    const regionStats = await agentStatsService.getRegionStats(regionId)
    return success(res, {
      region,
      pendingStudent,
      pendingMerchant,
      pendingCourier,
      userCount,
      pendingReports,
      regionStats,
    })
  } catch (err) {
    next(err)
  }
}

export async function listVerifications(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { type, status = 'pending', page = 1, pageSize = 20 } = query
    const filter = { regionId: req.user.regionId }
    if (type) filter.type = type
    if (status) filter.status = status
    const skip = (Number(page) - 1) * Number(pageSize)
    const [list, total] = await Promise.all([
      Verification.find(filter)
        .populate('userId', 'phone nickname avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(pageSize)),
      Verification.countDocuments(filter),
    ])
    return success(res, {
      list,
      pagination: paginationMeta(Number(page), Number(pageSize), total),
    })
  } catch (err) {
    next(err)
  }
}

export async function reviewVerification(req, res, next) {
  try {
    const { status, rejectReason } = req.body
    if (!['approved', 'rejected'].includes(status)) {
      return fail(res, ErrorCodes.BAD_REQUEST, '无效的审核状态')
    }
    const verification = await verificationService.reviewVerification(
      req.params.id,
      req.user,
      { status, rejectReason }
    )
    return success(res, verification, status === 'approved' ? '审核通过' : '已拒绝')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function listUsers(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { page = 1, pageSize = 20, role, status } = query
    const filter = { regionId: req.user.regionId }
    if (role) filter.role = role
    if (status) filter.status = status
    const skip = (Number(page) - 1) * Number(pageSize)
    const [list, total] = await Promise.all([
      User.find(filter).select('-password -refreshToken').sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)),
      User.countDocuments(filter),
    ])
    return success(res, { list, pagination: paginationMeta(Number(page), Number(pageSize), total) })
  } catch (err) {
    next(err)
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return fail(res, ErrorCodes.NOT_FOUND, '用户不存在', 404)
    if (user.regionId?.toString() !== req.user.regionId?.toString()) {
      return fail(res, ErrorCodes.REGION_FORBIDDEN, '无权操作其他区域用户', 403)
    }
    user.status = status
    await user.save()
    await createAuditLog({
      operator: req.user,
      action: `user_${status}`,
      targetType: 'user',
      targetId: user._id,
      detail: { status },
      ip: req.ip,
    })
    return success(res, user, '操作成功')
  } catch (err) {
    next(err)
  }
}

export async function listProducts(req, res, next) {
  try {
    const { status, page = 1, pageSize = 20, keyword } = req.query
    const filter = { regionId: req.user.regionId }
    if (status) filter.status = status
    if (keyword) filter.$text = { $search: keyword }
    const skip = (Number(page) - 1) * Number(pageSize)
    const [list, total] = await Promise.all([
      Product.find(filter)
        .populate('sellerId', 'nickname phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(pageSize)),
      Product.countDocuments(filter),
    ])
    return success(res, { list, pagination: paginationMeta(Number(page), Number(pageSize), total) })
  } catch (err) {
    next(err)
  }
}

export async function moderateProduct(req, res, next) {
  try {
    const { status } = req.body
    const product = await Product.findById(req.params.id)
    if (!product) return fail(res, ErrorCodes.NOT_FOUND, '商品不存在', 404)
    if (product.regionId.toString() !== req.user.regionId?.toString()) {
      return fail(res, ErrorCodes.REGION_FORBIDDEN, '无权操作其他区域', 403)
    }
    const updated = await productService.updateProductStatus(req.params.id, req.user, status, true)
    await createAuditLog({
      operator: req.user,
      action: `product_${status}`,
      targetType: 'product',
      targetId: product._id,
      detail: { status },
      ip: req.ip,
    })
    return success(res, updated, '操作成功')
  } catch (err) {
    next(err)
  }
}

export async function listOrders(req, res, next) {
  try {
    const data = await orderService.listRegionOrders(req.user.regionId, req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function restoreOrder(req, res, next) {
  try {
    const order = await orderService.restoreOrder(req.params.id, {
      regionId: req.user.regionId,
    })
    await createAuditLog({
      operator: req.user,
      action: 'order_restore',
      targetType: 'order',
      targetId: order._id,
      regionId: order.regionId,
      detail: { productId: order.productId },
      ip: req.ip,
    })
    return success(res, order, '订单已恢复')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 400)
    next(err)
  }
}

export async function listDeliveryOrders(req, res, next) {
  try {
    const regionId = req.user.regionId?._id || req.user.regionId
    if (!regionId) return fail(res, ErrorCodes.BAD_REQUEST, '代理未绑定区域')
    const data = await deliveryOrderService.listRegionOrders(regionId, req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { page = 1, pageSize = 20 } = query
    const skip = (Number(page) - 1) * Number(pageSize)
    const filter = { regionId: req.user.regionId }
    const [list, total] = await Promise.all([
      AuditLog.find(filter).populate('operatorId', 'nickname phone role').sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)),
      AuditLog.countDocuments(filter),
    ])
    return success(res, { list, pagination: paginationMeta(Number(page), Number(pageSize), total) })
  } catch (err) {
    next(err)
  }
}
