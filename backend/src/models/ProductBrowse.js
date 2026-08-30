import mongoose from 'mongoose'

const productBrowseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region' },
    category: { type: String, default: '' },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

productBrowseSchema.index({ userId: 1, productId: 1 }, { unique: true })
productBrowseSchema.index({ userId: 1, viewedAt: -1 })

export default mongoose.model('ProductBrowse', productBrowseSchema)
