import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Region from '../models/Region.js'
import Verification from '../models/Verification.js'
import AuditLog from '../models/AuditLog.js'
import MerchantProfile from '../models/MerchantProfile.js'
import Report from '../models/Report.js'
import Product from '../models/Product.js'
import { activeProductFilter } from '../utils/productQuery.js'
import DeliveryOrder from '../models/DeliveryOrder.js'
import { DELIVERY_ORDER_STATUS } from '../constants/delivery.js'
import * as verificationService from '../services/verificationService.js'
import * as productService from '../services/productService.js'
import * as deliveryOrderService from '../services/deliveryOrderService.js'
import { createAuditLog } from '../services/auditService.js'
import { ROLES } from '../constants/roles.js'
import { ErrorCodes, fail, success } from '../utils/response.js'
import { buildPlatformCharts } from '../services/platformChartService.js'
import * as orderService from '../services/orderService.js'
import { parsePagination, paginationMeta } from '../utils/pagination.js'

export async function dashboard(req, res, next) {
  try {
    const [userCount, regionCount, pendingVerifications, pendingCourier, merchantCount, pendingReports, deliveryOpen, deliveryTotal] =
      await Promise.all([
      User.countDocuments({ status: 'active' }),
      Region.countDocuments({ status: 'active' }),
      Verification.countDocuments({ status: 'pending' }),
      Verification.countDocuments({ status: 'pending', type: 'courier' }),
      MerchantProfile.countDocuments({ status: 'active' }),
      Report.countDocuments({ status: 'pending' }),
      DeliveryOrder.countDocuments({ status: DELIVERY_ORDER_STATUS.OPEN }),
      DeliveryOrder.countDocuments(),
    ])
    const charts = await buildPlatformCharts()
    return success(res, {
      userCount,
      regionCount,
      pendingVerifications,
      pendingCourier,
      merchantCount,
      pendingReports,
      deliveryOpen,
      deliveryTotal,
      charts,
    })
  } catch (err) {
    next(err)
  }
}

export async function createAgent(req, res, next) {
  try {
    const { phone, password, nickname, regionId } = req.body
    const exists = await User.findOne({ phone })
    if (exists) return fail(res, ErrorCodes.CONFLICT, '手机号已存在', 409)

    const region = await Region.findById(regionId)
    if (!region) return fail(res, ErrorCodes.NOT_FOUND, '区域不存在', 404)

    const hashed = await bcrypt.hash(password, 10)
    const agent = await User.create({
      phone,
      password: hashed,
      nickname: nickname || `代理${phone.slice(-4)}`,
      role: ROLES.REGIONAL_AGENT,
      regionId,
    })
    region.agentId = agent._id
    await region.save()

    const result = agent.toObject()
    delete result.password
    return success(res, result, '区域代理创建成功')
  } catch (err) {
    next(err)
  }
}

export async function listAgents(req, res, next) {
  try {
    const agents = await User.find({ role: ROLES.REGIONAL_AGENT })
      .select('-password -refreshToken')
      .populate('regionId', 'name code')
    return success(res, agents)
  } catch (err) {
    next(err)
  }
}

export async function listUsers(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { role, regionId, status } = query
    const { page, pageSize, skip } = parsePagination(query)
    const filter = {}
    if (role) filter.role = role
    if (regionId) filter.regionId = regionId
    if (status) filter.status = status
    const [list, total] = await Promise.all([
      User.find(filter).select('-password -refreshToken').populate('regionId', 'name code').sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      User.countDocuments(filter),
    ])
    return success(res, { list, pagination: paginationMeta(page, pageSize, total) })
  } catch (err) {
    next(err)
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!user) return fail(res, ErrorCodes.NOT_FOUND, '用户不存在', 404)
    return success(res, user, '操作成功')
  } catch (err) {
    next(err)
  }
}

export async function listVerifications(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { type, status, regionId } = query
    const { page, pageSize, skip } = parsePagination(query)
    const filter = {}
    if (type) filter.type = type
    if (status) filter.status = status
    if (regionId) filter.regionId = regionId
    const [list, total] = await Promise.all([
      Verification.find(filter)
        .populate('userId', 'phone nickname')
        .populate('regionId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Verification.countDocuments(filter),
    ])
    return success(res, { list, pagination: paginationMeta(page, pageSize, total) })
  } catch (err) {
    next(err)
  }
}

export async function reviewVerification(req, res, next) {
  try {
    const { status, rejectReason } = req.body
    const verification = await verificationService.reviewVerification(
      req.params.id,
      req.user,
      { status, rejectReason }
    )
    return success(res, verification, '审核完成')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function listOrders(req, res, next) {
  try {
    const data = await orderService.listAdminOrders(req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function restoreOrder(req, res, next) {
  try {
    const order = await orderService.restoreOrder(req.params.id)
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

export async function listProducts(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { status, regionId, keyword, deleted } = query
    const { page, pageSize, skip } = parsePagination(query)
    const filter = {}
    if (status) filter.status = status
    if (regionId) filter.regionId = regionId
    if (keyword) filter.$text = { $search: keyword }
    if (deleted === 'only') {
      filter.deletedAt = { $ne: null }
    } else if (deleted !== 'all') {
      Object.assign(filter, activeProductFilter())
    }
    const [list, total] = await Promise.all([
      Product.find(filter)
        .populate('sellerId', 'nickname phone role')
        .populate('regionId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Product.countDocuments(filter),
    ])
    return success(res, { list, pagination: paginationMeta(page, pageSize, total) })
  } catch (err) {
    next(err)
  }
}

export async function moderateProduct(req, res, next) {
  try {
    const { status } = req.body
    const product = await Product.findById(req.params.id)
    if (!product) return fail(res, ErrorCodes.NOT_FOUND, '商品不存在', 404)
    const updated = await productService.updateProductStatus(req.params.id, req.user, status, true)
    await createAuditLog({
      operator: req.user,
      action: `product_${status}`,
      targetType: 'product',
      targetId: product._id,
      regionId: product.regionId,
      detail: { status, title: product.title },
      ip: req.ip,
    })
    return success(res, updated, '操作成功')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { regionId } = query
    const { page, pageSize, skip } = parsePagination(query)
    const filter = {}
    if (regionId) filter.regionId = regionId
    const [list, total] = await Promise.all([
      AuditLog.find(filter).populate('operatorId', 'nickname phone role').sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      AuditLog.countDocuments(filter),
    ])
    return success(res, { list, pagination: paginationMeta(page, pageSize, total) })
  } catch (err) {
    next(err)
  }
}

export async function listDeliveryOrders(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const { regionId } = query
    const data = await deliveryOrderService.listRegionOrders(regionId, query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}
