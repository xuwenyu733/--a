import mongoose from 'mongoose'

const refundRequestSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    sellerReply: { type: String, default: '', maxlength: 500 },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true }
)

refundRequestSchema.index({ buyerId: 1, createdAt: -1 })
refundRequestSchema.index({ sellerId: 1, status: 1, createdAt: -1 })
refundRequestSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
)

export default mongoose.model('RefundRequest', refundRequestSchema)
