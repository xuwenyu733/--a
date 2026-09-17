import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    /** 有序参与者对键 `${lowId}:${highId}`，防并发重复建会话 */
    participantKey: { type: String, default: null },
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

conversationSchema.index({ participantKey: 1 }, { unique: true, sparse: true })
conversationSchema.index({ participants: 1, updatedAt: -1 })

export default mongoose.model('Conversation', conversationSchema)
