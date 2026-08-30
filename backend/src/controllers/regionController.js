import Region from '../models/Region.js'
import { seedDefaultZonesForRegion } from '../services/deliveryZoneService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

export async function listRegions(req, res, next) {
  try {
    const regions = await Region.find({ status: 'active' })
      .select('name code province city address')
      .sort({ name: 1 })
    return success(res, regions)
  } catch (err) {
    next(err)
  }
}

export async function createRegion(req, res, next) {
  try {
    const { name, code, province, city, address } = req.body
    const region = await Region.create({ name, code, province, city, address })
    const zones = await seedDefaultZonesForRegion(region._id)
    return success(res, { region, zonesSeeded: zones.length }, '区域创建成功，已初始化配送区域')
  } catch (err) {
    next(err)
  }
}

export async function updateRegion(req, res, next) {
  try {
    const region = await Region.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!region) return fail(res, ErrorCodes.NOT_FOUND, '区域不存在', 404)
    return success(res, region, '更新成功')
  } catch (err) {
    next(err)
  }
}

export async function listAllRegions(req, res, next) {
  try {
    const regions = await Region.find()
      .populate('agentId', 'phone nickname')
      .sort({ createdAt: -1 })
    return success(res, regions)
  } catch (err) {
    next(err)
  }
}

export async function assignAgent(req, res, next) {
  try {
    const { agentId } = req.body
    const region = await Region.findById(req.params.id)
    if (!region) return fail(res, ErrorCodes.NOT_FOUND, '区域不存在', 404)

    if (region.agentId) {
      await (await import('../models/User.js')).default.findByIdAndUpdate(region.agentId, {
        regionId: null,
        role: (await import('../constants/roles.js')).ROLES.STUDENT,
      })
    }

    if (agentId) {
      const User = (await import('../models/User.js')).default
      const { ROLES } = await import('../constants/roles.js')
      const agent = await User.findById(agentId)
      if (!agent) return fail(res, ErrorCodes.NOT_FOUND, '代理用户不存在', 404)
      agent.role = ROLES.REGIONAL_AGENT
      agent.regionId = region._id
      await agent.save()
      region.agentId = agentId
    } else {
      region.agentId = null
    }
    await region.save()
    const updated = await Region.findById(region._id).populate('agentId', 'phone nickname')
    return success(res, updated, '代理分配成功')
  } catch (err) {
    next(err)
  }
}
