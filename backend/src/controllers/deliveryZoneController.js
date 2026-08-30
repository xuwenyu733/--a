import * as deliveryZoneService from '../services/deliveryZoneService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

export async function listPublicZones(req, res, next) {
  try {
    const { regionId } = req.query
    if (!regionId) return fail(res, ErrorCodes.BAD_REQUEST, '请指定校区 regionId')
    const list = await deliveryZoneService.listActiveZones(regionId)
    return success(res, list)
  } catch (err) {
    next(err)
  }
}

export async function listAdminZones(req, res, next) {
  try {
    const data = await deliveryZoneService.listAllZones(req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function createZone(req, res, next) {
  try {
    const { regionId, name, code, sortOrder, status } = req.body
    const doc = await deliveryZoneService.createZone({
      regionId,
      name: name.trim(),
      code: code.trim(),
      sortOrder: sortOrder ?? 0,
      status: status || 'active',
    })
    return success(res, doc, '创建成功')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function updateZone(req, res, next) {
  try {
    const doc = await deliveryZoneService.updateZone(req.params.id, req.body)
    return success(res, doc, '更新成功')
  } catch (err) {
    if (err.code === 40400) return fail(res, err.code, err.message, 404)
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function removeZone(req, res, next) {
  try {
    await deliveryZoneService.deleteZone(req.params.id)
    return success(res, null, '已删除')
  } catch (err) {
    if (err.code === 40400) return fail(res, err.code, err.message, 404)
    next(err)
  }
}

export async function seedZones(req, res, next) {
  try {
    const { regionId } = req.body
    const docs = await deliveryZoneService.seedDefaultZonesForRegion(regionId)
    return success(res, docs, docs.length ? '已初始化默认区域' : '该区域已有配送区，未重复创建')
  } catch (err) {
    next(err)
  }
}
