import DeliveryZone from '../models/DeliveryZone.js'
import Region from '../models/Region.js'
import { DEFAULT_ZONE_TEMPLATES } from '../constants/delivery.js'
import { paginationMeta } from '../utils/pagination.js'

export async function listActiveZones(regionId) {
  return DeliveryZone.find({ regionId, status: 'active' })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()
}

export async function listAllZones({ regionId, page = 1, pageSize = 50 } = {}) {
  const filter = {}
  if (regionId) filter.regionId = regionId
  const skip = (Number(page) - 1) * Number(pageSize)
  const [list, total] = await Promise.all([
    DeliveryZone.find(filter)
      .populate('regionId', 'name code')
      .sort({ regionId: 1, sortOrder: 1 })
      .skip(skip)
      .limit(Number(pageSize))
      .lean(),
    DeliveryZone.countDocuments(filter),
  ])
  return { list, pagination: paginationMeta(Number(page), Number(pageSize), total) }
}

export async function createZone(payload) {
  const region = await Region.findById(payload.regionId)
  if (!region) {
    const err = new Error('所属校区不存在')
    err.code = 40400
    throw err
  }
  const exists = await DeliveryZone.findOne({ regionId: payload.regionId, code: payload.code })
  if (exists) {
    const err = new Error('该区域编码已存在')
    err.code = 40900
    throw err
  }
  return DeliveryZone.create(payload)
}

export async function updateZone(id, payload) {
  const zone = await DeliveryZone.findById(id)
  if (!zone) {
    const err = new Error('配送区域不存在')
    err.code = 40400
    throw err
  }
  if (payload.code && payload.code !== zone.code) {
    const dup = await DeliveryZone.findOne({ regionId: zone.regionId, code: payload.code, _id: { $ne: id } })
    if (dup) {
      const err = new Error('该区域编码已存在')
      err.code = 40900
      throw err
    }
  }
  Object.assign(zone, {
    name: payload.name ?? zone.name,
    code: payload.code ?? zone.code,
    sortOrder: payload.sortOrder ?? zone.sortOrder,
    status: payload.status ?? zone.status,
  })
  await zone.save()
  return zone
}

export async function deleteZone(id) {
  const zone = await DeliveryZone.findByIdAndDelete(id)
  if (!zone) {
    const err = new Error('配送区域不存在')
    err.code = 40400
    throw err
  }
  return zone
}

export async function seedDefaultZonesForRegion(regionId) {
  const existing = await DeliveryZone.countDocuments({ regionId })
  if (existing > 0) return []
  const docs = await DeliveryZone.insertMany(
    DEFAULT_ZONE_TEMPLATES.map((t) => ({ ...t, regionId, status: 'active' }))
  )
  return docs
}
