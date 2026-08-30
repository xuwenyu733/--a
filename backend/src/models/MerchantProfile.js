import mongoose from 'mongoose'

const merchantProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    shopName: { type: String, required: true, trim: true },
    shopLogo: { type: String, default: '' },
    description: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    address: { type: String, default: '' },
    businessLicense: { type: String, default: '' },
    licenseImage: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
    stats: {
      productCount: { type: Number, default: 0 },
      orderCount: { type: Number, default: 0 },
      rating: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
)

merchantProfileSchema.index({ userId: 1 }, { unique: true })
merchantProfileSchema.index({ regionId: 1, status: 1 })

export default mongoose.model('MerchantProfile', merchantProfileSchema)
