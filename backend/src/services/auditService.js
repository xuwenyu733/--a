import AuditLog from '../models/AuditLog.js'

export async function createAuditLog({ operator, action, targetType, targetId, detail = {}, ip = '', regionId }) {
  return AuditLog.create({
    operatorId: operator._id,
    operatorRole: operator.role,
    regionId: regionId || operator.regionId || null,
    action,
    targetType,
    targetId,
    detail,
    ip,
  })
}
