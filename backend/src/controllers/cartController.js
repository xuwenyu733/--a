import * as cartService from '../services/cartService.js'
import { fail, httpStatusFromBizCode, success } from '../utils/response.js'

export async function list(req, res, next) {
  try {
    const data = await cartService.listCart(req.user._id, req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function count(req, res, next) {
  try {
    const n = await cartService.cartCount(req.user._id)
    return success(res, { count: n })
  } catch (err) {
    next(err)
  }
}

export async function add(req, res, next) {
  try {
    const item = await cartService.addToCart(req.user, req.body)
    return success(res, item, '已加入购物车')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, httpStatusFromBizCode(err.code))
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const item = await cartService.updateCartItem(req.user._id, req.params.id, req.body)
    return success(res, item, '已更新')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, httpStatusFromBizCode(err.code))
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    await cartService.removeCartItem(req.user._id, req.params.id)
    return success(res, null, '已移除')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, httpStatusFromBizCode(err.code))
    next(err)
  }
}

export async function clear(req, res, next) {
  try {
    const data = await cartService.clearCart(req.user._id)
    return success(res, data, '购物车已清空')
  } catch (err) {
    next(err)
  }
}

export async function checkout(req, res, next) {
  try {
    const data = await cartService.checkoutCart(req.user, req.body)
    const msg =
      data.failedCount > 0
        ? `成功下单 ${data.successCount} 件，${data.failedCount} 件失败`
        : `成功下单 ${data.successCount} 件`
    return success(res, data, msg)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, httpStatusFromBizCode(err.code))
    next(err)
  }
}
