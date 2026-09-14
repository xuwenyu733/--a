import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    sellerType: { type: String, enum: ['student', 'merchant'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    /** 可售库存；下单扣减可为 0，为 0 时自动下架；发布/编辑时 API 要求 ≥1 */
    stock: { type: Number, required: true, min: 0, default: 1 },
    originalPrice: { type: Number, default: null, min: 0 },
    category: {
      type: String,
      enum: ['book', 'electronics', 'daily', 'clothing', 'other'],
      required: true,
    },
    images: { type: [String], default: [], validate: [(v) => v.length <= 9, '最多9张图片'] },
    videos: { type: [String], default: [], validate: [(v) => v.length <= 1, '最多1个视频'] },
    condition: { type: String, enum: ['new', 'like_new', 'good', 'fair'], default: 'good' },
    status: {
      type: String,
      enum: ['on_sale', 'sold', 'off_shelf', 'rejected'],
      default: 'on_sale',
    },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    location: { type: String, default: '' },
    searchText: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

productSchema.index({ deletedAt: 1 })

productSchema.index({ regionId: 1, status: 1, category: 1, createdAt: -1 })
productSchema.index({ regionId: 1, status: 1, price: 1 })
productSchema.index({ sellerId: 1, createdAt: -1 })
productSchema.index({ title: 'text', description: 'text' })
productSchema.index({ searchText: 1 })

export default mongoose.model('Product', productSchema)
