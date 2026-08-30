import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    sellerType: { type: String, enum: ['student', 'merchant'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 2000 },
    tradeMode: {
      type: String,
      enum: ['sell', 'exchange'],
      default: 'sell',
    },
    price: { type: Number, required: true, min: 0 },
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
    groupBuy: {
      enabled: { type: Boolean, default: false },
      minCount: { type: Number, default: 2, min: 2, max: 20 },
      groupPrice: { type: Number, default: 0, min: 0 },
      status: { type: String, enum: ['open', 'success', 'cancelled'], default: 'open' },
      participants: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          joinedAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true }
)

productSchema.index({ deletedAt: 1 })

productSchema.index({ regionId: 1, status: 1, category: 1, createdAt: -1 })
productSchema.index({ regionId: 1, status: 1, price: 1 })
productSchema.index({ sellerId: 1, createdAt: -1 })
productSchema.index({ title: 'text', description: 'text' })
productSchema.index({ searchText: 1 })
productSchema.index({ 'groupBuy.enabled': 1, status: 1, regionId: 1 })

export default mongoose.model('Product', productSchema)
