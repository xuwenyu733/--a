import mongoose from 'mongoose'

const userAddressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    phone: { type: String, required: true, trim: true, maxlength: 11 },
    region: { type: String, default: '', trim: true, maxlength: 100 },
    detail: { type: String, required: true, trim: true, maxlength: 200 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

userAddressSchema.index({ userId: 1, isDefault: 1 })

export default mongoose.model('UserAddress', userAddressSchema)
