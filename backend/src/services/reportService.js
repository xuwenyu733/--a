import Report from '../models/Report.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { createAuditLog } from './auditService.js'
import { ROLES } from '../constants/roles.js'
import { paginationMeta } from '../utils/pagination.js'

export async function submitReport(reporter, { targetType, targetId, reason, description }) {
  let regionId = reporter.regionId

  if (targetType === 'product') {
    const product = await Product.findById(targetId)
    if (!product) {
      const err = new Error('商品不存在')
      err.code = 40400
      throw err
    }
    regionId = product.regionId
  } else if (targetType === 'user') {
    const user = await User.findById(targetId)
    if (!user) {
      const err = new Error('用户不存在')
      err.code = 40400
      throw err
    }
    regionId = user.regionId
    if (user._id.toString() === reporter._id.toString()) {
      const err = new Error('不能举报自己')
      err.code = 40000
      throw err
    }
  }

  const exists = await Report.findOne({
    reporterId: reporter._id,
    targetType,
    targetId,
    status: 'pending',
  })
  if (exists) {
    const err = new Error('您已提交过举报，请等待处理')
    err.code = 40900
    throw err
  }

  return Report.create({
    reporterId: reporter._id,
    regionId,
    targetType,
    targetId,
    reason,
    description: description || '',
  })
}

export async function listReports(query, user) {
  const { status = 'pending', page = 1, pageSize = 20, regionId } = query
  const filter = {}
  if (status) filter.status = status

  if (user.role === ROLES.REGIONAL_AGENT) {
    filter.regionId = user.regionId
  } else if (regionId) {
    filter.regionId = regionId
  }

  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    Report.find(filter)
      .populate('reporterId', 'nickname phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(pageSize)),
    Report.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function handleReport(reportId, handler, { status, handleNote }) {
  const report = await Report.findById(reportId)
  if (!report) {
    const err = new Error('举报不存在')
    err.code = 40400
    throw err
  }
  if (report.status !== 'pending') {
    const err = new Error('该举报已处理')
    err.code = 40900
    throw err
  }
  if (handler.role === ROLES.REGIONAL_AGENT) {
    if (report.regionId.toString() !== handler.regionId?.toString()) {
      const err = new Error('无权处理其他区域举报')
      err.code = 40302
      throw err
    }
  }

  report.status = status
  report.handleNote = handleNote || ''
  report.handlerId = handler._id
  report.handledAt = new Date()
  await report.save()

  if (status === 'resolved' && report.targetType === 'product') {
    await Product.findByIdAndUpdate(report.targetId, { status: 'off_shelf' })
  }
  if (status === 'resolved' && report.targetType === 'user') {
    await User.findByIdAndUpdate(report.targetId, { status: 'banned' })
  }

  if (status === 'resolved') {
    const { penalizeReportResolved } = await import('./creditService.js')
    await penalizeReportResolved(report)
  }

  await createAuditLog({
    operator: handler,
    action: `report_${status}`,
    targetType: 'report',
    targetId: report._id,
    detail: { handleNote, targetType: report.targetType, targetId: report.targetId },
  })

  return report
}
