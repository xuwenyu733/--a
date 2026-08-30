import mongoose from 'mongoose'

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    /** 收藏时的商品价格，用于降价提醒 */
    priceAtFavorite: { type: Number, default: null, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true })
favoriteSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('Favorite', favoriteSchema)
