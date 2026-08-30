import * as deliveryOrderService from '../services/deliveryOrderService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

function failWithCode(res, code, message) {
  const status = code === 40400 ? 404 : code >= 40300 ? 403 : 400
  return fail(res, code, message, status)
}

export async function createOrder(req, res, next) {
  try {
    const order = await deliveryOrderService.createOrder(req.user, req.body)
    return success(res, order, '发布成功')
  } catch (err) {
    if (err.code) return failWithCode(res, err.code, err.message)
    next(err)
  }
}

export async function listMyOrders(req, res, next) {
  try {
    const data = await deliveryOrderService.listMyOrders(req.user, req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function listOpenOrders(req, res, next) {
  try {
    const data = await deliveryOrderService.listOpenOrders(req.user, req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    if (err.code) return failWithCode(res, err.code, err.message)
    next(err)
  }
}

export async function acceptOrder(req, res, next) {
  try {
    const order = await deliveryOrderService.acceptOrder(req.user, req.params.id)
    return success(res, order, '接单成功')
  } catch (err) {
    if (err.code) return failWithCode(res, err.code, err.message)
    next(err)
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status, cancelReason } = req.body
    const order = await deliveryOrderService.updateOrderStatus(req.user, req.params.id, {
      status,
      cancelReason,
    })
    return success(res, order, '状态已更新')
  } catch (err) {
    if (err.code === 40400) return failWithCode(res, err.code, err.message)
    if (err.code) return failWithCode(res, err.code, err.message)
    next(err)
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await deliveryOrderService.getOrderDetail(req.user, req.params.id)
    return success(res, order)
  } catch (err) {
    if (err.code === 40400) return failWithCode(res, err.code, err.message)
    if (err.code) return failWithCode(res, err.code, err.message)
    next(err)
  }
}
