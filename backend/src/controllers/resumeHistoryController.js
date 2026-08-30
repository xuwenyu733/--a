import * as resumeHistoryService from '../services/resumeHistoryService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

function pickBody(body) {
  return {
    fileName: body.fileName,
    originalContent: body.originalContent,
    optimizedContent: body.optimizedContent,
    suggestions: body.suggestions,
    a4Metrics: body.a4Metrics,
    jobDescription: body.jobDescription,
    style: body.style,
    sourceType: body.sourceType,
    photoUrl: body.photoUrl,
    builderData: body.builderData,
  }
}

export async function list(req, res, next) {
  try {
    const data = await resumeHistoryService.listRecords(req.user._id, req.validatedQuery || req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function detail(req, res, next) {
  try {
    const data = await resumeHistoryService.getRecord(req.params.id, req.user._id)
    return success(res, data)
  } catch (err) {
    if (err.code === 40400) return fail(res, err.code, err.message, 404)
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const doc = await resumeHistoryService.createRecord(req.user._id, pickBody(req.body))
    return success(res, doc, '已保存到云端')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const doc = await resumeHistoryService.updateRecord(req.params.id, req.user._id, pickBody(req.body))
    return success(res, doc, '已更新')
  } catch (err) {
    if (err.code === 40400) return fail(res, err.code, err.message, 404)
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    await resumeHistoryService.deleteRecord(req.params.id, req.user._id)
    return success(res, null, '已删除')
  } catch (err) {
    if (err.code === 40400) return fail(res, err.code, err.message, 404)
    next(err)
  }
}
