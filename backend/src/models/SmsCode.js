import mongoose from 'mongoose'

const smsCodeSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

/** 到期后由 MongoDB TTL 自动清理 */
smsCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
smsCodeSchema.index({ phone: 1, createdAt: -1 })

export default mongoose.model('SmsCode', smsCodeSchema)
