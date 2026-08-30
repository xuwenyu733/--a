import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    operatorRole: { type: String, required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', default: null },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    detail: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

auditLogSchema.index({ regionId: 1, createdAt: -1 })
auditLogSchema.index({ operatorId: 1, createdAt: -1 })

export default mongoose.model('AuditLog', auditLogSchema)
