import mongoose from 'mongoose'
import { PAYMENT_CHANNEL, PAYMENT_PROVIDER, PAYMENT_TX_STATUS } from '../constants/payment.js'

const paymentTransactionSchema = new mongoose.Schema(
  {
    paymentNo: { type: String, required: true, unique: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    channel: { type: String, enum: Object.values(PAYMENT_CHANNEL), required: true },
    status: {
      type: String,
      enum: Object.values(PAYMENT_TX_STATUS),
      default: PAYMENT_TX_STATUS.PENDING,
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: PAYMENT_PROVIDER.SANDBOX,
    },
    prepayId: { type: String, default: '' },
    payUrl: { type: String, default: '' },
    qrContent: { type: String, default: '' },
    /** 小程序 requestPayment 参数（live 下单后缓存，便于重新调起） */
    payParams: { type: mongoose.Schema.Types.Mixed, default: null },
    transactionId: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    expiredAt: { type: Date, required: true },
    notifyRaw: { type: mongoose.Schema.Types.Mixed, default: null },
    /** none | needs_review — 金额不符、过期后不可入账、取消单到账等，需人工退款 */
    reconciliationStatus: { type: String, enum: ['none', 'needs_review'], default: 'none' },
    reconciliationReason: { type: String, default: '' },
    /** none | pending | success | failed | exhausted | skipped */
    shippingUploadStatus: {
      type: String,
      enum: ['none', 'pending', 'success', 'failed', 'exhausted', 'skipped'],
      default: 'none',
    },
    shippingUploadAttempts: { type: Number, default: 0 },
    shippingUploadError: { type: String, default: '' },
    shippingNextRetryAt: { type: Date, default: null },
  },
  { timestamps: true }
)

paymentTransactionSchema.index({ orderId: 1, status: 1, createdAt: -1 })
paymentTransactionSchema.index({ shippingUploadStatus: 1, shippingNextRetryAt: 1 })

export default mongoose.model('PaymentTransaction', paymentTransactionSchema)
