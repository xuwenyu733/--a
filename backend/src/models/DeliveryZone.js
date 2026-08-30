import mongoose from 'mongoose'

const deliveryZoneSchema = new mongoose.Schema(
  {
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    code: { type: String, required: true, trim: true, maxlength: 30 },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
)

deliveryZoneSchema.index({ regionId: 1, code: 1 }, { unique: true })
deliveryZoneSchema.index({ regionId: 1, status: 1, sortOrder: 1 })

export default mongoose.model('DeliveryZone', deliveryZoneSchema)
