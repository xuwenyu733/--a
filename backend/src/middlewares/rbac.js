import Region from '../models/Region.js'
import Verification from '../models/Verification.js'
import User from '../models/User.js'
import { ROLES } from '../constants/roles.js'
import { ErrorCodes, fail } from '../utils/response.js'

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, ErrorCodes.NO_PERMISSION, '无权访问', 403)
    }
    next()
  }
}

export function requireStudentVerified(req, res, next) {
  if (req.user.role !== ROLES.STUDENT) {
    return next()
  }
  if (!req.user.studentVerified) {
    return fail(res, ErrorCodes.NO_PERMISSION, '请先完成学生认证', 403)
  }
  next()
}

/** 区域代理只能操作本区域；超管跳过 */
export function requireRegionScope(getTargetRegionId) {
  return async (req, res, next) => {
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next()
    }
    if (req.user.role !== ROLES.REGIONAL_AGENT) {
      return fail(res, ErrorCodes.NO_PERMISSION, '无权访问', 403)
    }
    try {
      const targetRegionId = await getTargetRegionId(req)
      if (targetRegionId && targetRegionId.toString() !== req.user.regionId?.toString()) {
        return fail(res, ErrorCodes.REGION_FORBIDDEN, '无权操作其他区域', 403)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

export async function resolveVerificationRegion(req) {
  const verification = await Verification.findById(req.params.id)
  if (!verification) return null
  req.verification = verification
  return verification.regionId
}

export async function resolveUserRegion(req) {
  const user = await User.findById(req.params.id)
  if (!user) return null
  req.targetUser = user
  return user.regionId
}

export async function assertAgentOwnsRegion(req, regionId) {
  if (req.user.role === ROLES.SUPER_ADMIN) return true
  if (req.user.role === ROLES.REGIONAL_AGENT) {
    return regionId?.toString() === req.user.regionId?.toString()
  }
  return false
}
