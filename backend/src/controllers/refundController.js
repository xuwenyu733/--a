import * as refundService from '../services/refundService.js'
import { fail, success, httpStatusFromCode } from '../utils/response.js'

function mapErr(err, res) {
  if (!err.code) return false
  fail(res, err.code, err.message, httpStatusFromCode(err.code))
  return true
}

export async function create(req, res, next) {
  try {
    const data = await refundService.createRefundRequest(req.user, req.params.id, req.body)
    return success(res, data, '退款申请已提交')
  } catch (err) {
    if (mapErr(err, res)) return
    next(err)
  }
}

export async function getByOrder(req, res, next) {
  try {
    const data = await refundService.getRefundByOrder(req.params.id, req.user._id)
    return success(res, data)
  } catch (err) {
    if (mapErr(err, res)) return
    next(err)
  }
}

export async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const data = await refundService.listRefunds(req.user._id, query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function respond(req, res, next) {
  try {
    const data = await refundService.respondRefund(req.user, req.params.id, req.body)
    return success(res, data, req.body.action === 'approve' ? '已同意退款' : '已拒绝退款')
  } catch (err) {
    if (mapErr(err, res)) return
    next(err)
  }
}

export async function cancel(req, res, next) {
  try {
    const data = await refundService.cancelRefund(req.user, req.params.id)
    return success(res, data, '已撤销申请')
  } catch (err) {
    if (mapErr(err, res)) return
    next(err)
  }
}
