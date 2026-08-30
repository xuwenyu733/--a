import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    lastMessage: {
      content: { type: String, default: '' },
      type: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      createdAt: { type: Date, default: null },
    },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
)

conversationSchema.index({ participants: 1 })
conversationSchema.index({ updatedAt: -1 })

export default mongoose.model('Conversation', conversationSchema)
