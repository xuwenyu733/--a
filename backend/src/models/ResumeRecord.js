import mongoose from 'mongoose'

const resumeRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, default: '', trim: true, maxlength: 200 },
    originalContent: { type: String, default: '', maxlength: 80000 },
    optimizedContent: { type: String, default: '', maxlength: 80000 },
    suggestions: { type: [String], default: [] },
    a4Metrics: { type: mongoose.Schema.Types.Mixed, default: null },
    jobDescription: { type: String, default: '', maxlength: 10000 },
    style: {
      type: String,
      enum: ['professional', 'creative', 'concise'],
      default: 'professional',
    },
    sourceType: {
      type: String,
      enum: ['upload', 'builder'],
      default: 'upload',
    },
    photoUrl: { type: String, default: '', maxlength: 500 },
    builderData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

resumeRecordSchema.index({ userId: 1, updatedAt: -1 })

export default mongoose.model('ResumeRecord', resumeRecordSchema)
