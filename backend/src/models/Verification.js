import mongoose from 'mongoose'

const verificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    type: { type: String, enum: ['student', 'merchant', 'courier'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    rejectReason: { type: String, default: '' },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

verificationSchema.index({ regionId: 1, type: 1, status: 1, createdAt: -1 })
verificationSchema.index({ userId: 1, type: 1 })

export default mongoose.model('Verification', verificationSchema)
