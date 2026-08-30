import mongoose from 'mongoose'

const tradeReviewSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

tradeReviewSchema.index({ orderId: 1, reviewerId: 1 }, { unique: true })
tradeReviewSchema.index({ revieweeId: 1, createdAt: -1 })

export default mongoose.model('TradeReview', tradeReviewSchema)
