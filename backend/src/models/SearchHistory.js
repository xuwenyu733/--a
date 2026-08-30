import mongoose from 'mongoose'

const searchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    keyword: { type: String, required: true, trim: true, maxlength: 50 },
  },
  { timestamps: true }
)

searchHistorySchema.index({ userId: 1, keyword: 1 }, { unique: true })
searchHistorySchema.index({ userId: 1, updatedAt: -1 })

export default mongoose.model('SearchHistory', searchHistorySchema)
