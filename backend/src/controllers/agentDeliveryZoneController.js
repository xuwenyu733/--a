import DeliveryZone from '../models/DeliveryZone.js'
import * as deliveryZoneService from '../services/deliveryZoneService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

function getAgentRegionId(user) {
  const regionId = user.regionId?._id || user.regionId
  if (!regionId) {
    const err = new Error('代理未绑定负责区域')
    err.code = 40301
    throw err
  }
  return regionId
}

async function assertZoneInRegion(zoneId, regionId) {
  const zone = await DeliveryZone.findById(zoneId)
  if (!zone || zone.regionId.toString() !== regionId.toString()) {
    const err = new Error('无权操作其他区域的配送区')
    err.code = 40302
    throw err
  }
  return zone
}

export async function listZones(req, res, next) {
  try {
    const regionId = getAgentRegionId(req.user)
    const data = await deliveryZoneService.listAllZones({
      regionId,
      page: req.query.page,
      pageSize: req.query.pageSize || 100,
    })
    return success(res, data)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function createZone(req, res, next) {
  try {
    const regionId = getAgentRegionId(req.user)
    const { name, code, sortOrder, status } = req.body
    if (!name?.trim() || !code?.trim()) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请填写名称与编码')
    }
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
    const regionId = getAgentRegionId(req.user)
    await assertZoneInRegion(req.params.id, regionId)
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
    const regionId = getAgentRegionId(req.user)
    await assertZoneInRegion(req.params.id, regionId)
    await deliveryZoneService.deleteZone(req.params.id)
    return success(res, null, '已删除')
  } catch (err) {
    if (err.code === 40400) return fail(res, err.code, err.message, 404)
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function seedZones(req, res, next) {
  try {
    const regionId = getAgentRegionId(req.user)
    const docs = await deliveryZoneService.seedDefaultZonesForRegion(regionId)
    return success(res, docs, docs.length ? '已初始化默认区域' : '本区域已有配送区，未重复创建')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}
