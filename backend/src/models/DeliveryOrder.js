import mongoose from 'mongoose'
import { DELIVERY_ORDER_STATUS, DELIVERY_ORDER_TYPES } from '../constants/delivery.js'

const deliveryOrderSchema = new mongoose.Schema(
  {
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true, index: true },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone', required: true, index: true },
    posterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: {
      type: String,
      enum: Object.values(DELIVERY_ORDER_TYPES),
      required: true,
    },
    title: { type: String, default: '', trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1000 },
    pickupAddress: { type: String, required: true, trim: true, maxlength: 200 },
    dropoffAddress: { type: String, required: true, trim: true, maxlength: 200 },
    contactPhone: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    remark: { type: String, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: Object.values(DELIVERY_ORDER_STATUS),
      default: DELIVERY_ORDER_STATUS.OPEN,
      index: true,
    },
    cancelReason: { type: String, default: '' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

deliveryOrderSchema.index({ regionId: 1, zoneId: 1, status: 1, createdAt: -1 })
deliveryOrderSchema.index({ posterId: 1, createdAt: -1 })
deliveryOrderSchema.index({ courierId: 1, createdAt: -1 })

export default mongoose.model('DeliveryOrder', deliveryOrderSchema)
