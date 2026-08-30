import mongoose from 'mongoose'

const courierProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    realName: { type: String, required: true, trim: true },
    contactPhone: { type: String, default: '', trim: true },
    serviceTypes: {
      type: [String],
      enum: ['food', 'express', 'other'],
      default: ['food', 'express'],
    },
    intro: { type: String, default: '', maxlength: 500 },
    allowedZoneIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' }],
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    stats: {
      orderCount: { type: Number, default: 0 },
      completedCount: { type: Number, default: 0 },
      rating: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
)

courierProfileSchema.index({ userId: 1 }, { unique: true })
courierProfileSchema.index({ regionId: 1, status: 1 })

export default mongoose.model('CourierProfile', courierProfileSchema)
