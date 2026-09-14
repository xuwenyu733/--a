import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerType: { type: String, enum: ['student', 'merchant'], required: true },
    /** 购买数量 */
    quantity: { type: Number, required: true, min: 1, default: 1 },
    /** 订单总价 = 单价 × 数量 */
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    remark: { type: String, default: '', maxlength: 200 },
    cancelReason: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ['none', 'pending_online', 'buyer_marked', 'seller_confirmed', 'paid_online'],
      default: 'none',
    },
    paymentMethod: {
      type: String,
      enum: ['manual', 'wechat', 'alipay'],
      default: 'manual',
    },
    latestPaymentNo: { type: String, default: null },
    buyerPaidAt: { type: Date, default: null },
  },
  { timestamps: true }
)

orderSchema.index({ deletedAt: 1 })

orderSchema.index({ buyerId: 1, createdAt: -1 })
orderSchema.index({ sellerId: 1, createdAt: -1 })
orderSchema.index({ regionId: 1, status: 1, createdAt: -1 })
orderSchema.index({ productId: 1, status: 1 })

export default mongoose.model('Order', orderSchema)
