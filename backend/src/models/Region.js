import mongoose from 'mongoose'

const regionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    province: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
)

regionSchema.index({ code: 1 }, { unique: true })
regionSchema.index({ agentId: 1 })
regionSchema.index({ status: 1 })

export default mongoose.model('Region', regionSchema)
