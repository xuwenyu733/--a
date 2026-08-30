import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    targetType: { type: String, enum: ['product', 'user'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: ['fraud', 'fake', 'illegal', 'harassment', 'other'], required: true },
    description: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' },
    handlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    handleNote: { type: String, default: '' },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true }
)

reportSchema.index({ regionId: 1, status: 1, createdAt: -1 })
reportSchema.index({ targetType: 1, targetId: 1 })

export default mongoose.model('Report', reportSchema)
