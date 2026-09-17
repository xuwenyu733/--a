import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ conversationId: 1, receiverId: 1, read: 1 })
// 聊天消息保留 365 天
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 })

export default mongoose.model('Message', messageSchema)
