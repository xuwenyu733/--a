import mongoose from 'mongoose'

const friendshipSchema = new mongoose.Schema(
  {
    /** Canonical pair: smaller ObjectId string first */
    userLow: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userHigh: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

friendshipSchema.index({ userLow: 1, userHigh: 1 }, { unique: true })
friendshipSchema.index({ status: 1, updatedAt: -1 })
friendshipSchema.index({ requesterId: 1, status: 1 })

export default mongoose.model('Friendship', friendshipSchema)
