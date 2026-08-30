import * as reportService from '../services/reportService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

const REASON_LABELS = {
  fraud: '涉嫌诈骗',
  fake: '虚假商品',
  illegal: '违规内容',
  harassment: '骚扰行为',
  other: '其他',
}

export async function submit(req, res, next) {
  try {
    const { targetType, targetId, reason, description } = req.body
    if (!targetType || !targetId || !reason) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请填写完整举报信息')
    }
    const report = await reportService.submitReport(req.user, {
      targetType,
      targetId,
      reason,
      description,
    })
    return success(res, report, '举报已提交，我们将尽快处理')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function list(req, res, next) {
  try {
    const data = await reportService.listReports(req.validatedQuery || req.query, req.user)
    return success(res, { ...data, reasonLabels: REASON_LABELS })
  } catch (err) {
    next(err)
  }
}

export async function handle(req, res, next) {
  try {
    const { status, handleNote } = req.body
    const report = await reportService.handleReport(req.params.id, req.user, { status, handleNote })
    return success(res, report, '处理完成')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function getReasons(req, res) {
  return success(res, REASON_LABELS)
}
