import * as orderService from '../services/orderService.js'
import { ErrorCodes, fail, httpStatusFromBizCode, success } from '../utils/response.js'

export async function create(req, res, next) {
  try {
    const { productId, remark, useGroupPrice } = req.body
    if (!productId) return fail(res, ErrorCodes.BAD_REQUEST, '请指定商品')
    const order = await orderService.createOrder(req.user, { productId, remark, useGroupPrice })
    return success(res, order, '下单成功，等待卖家确认')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, httpStatusFromBizCode(err.code))
    next(err)
  }
}

export async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const data = await orderService.listOrders(req.user._id, query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function detail(req, res, next) {
  try {
    const order = await orderService.getOrderDetail(req.params.id, req.user._id)
    return success(res, order)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function hide(req, res, next) {
  try {
    await orderService.hideOrder(req.params.id, req.user._id)
    return success(res, null, '订单已从列表移除')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function markPaid(req, res, next) {
  try {
    const order = await orderService.markBuyerPaid(req.params.id, req.user._id)
    return success(res, order, '已标记付款')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, httpStatusFromBizCode(err.code))
    next(err)
  }
}

export async function confirmPayment(req, res, next) {
  try {
    const order = await orderService.confirmSellerReceivedPayment(req.params.id, req.user._id)
    return success(res, order, '已确认收款')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, httpStatusFromBizCode(err.code))
    next(err)
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status, cancelReason } = req.body
    if (!status) return fail(res, ErrorCodes.BAD_REQUEST, '请指定状态')
    const order = await orderService.updateOrderStatus(req.params.id, req.user._id, {
      status,
      cancelReason,
    })
    return success(res, order, '订单状态已更新')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}
