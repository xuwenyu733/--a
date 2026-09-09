import mongoose from 'mongoose'
import { ROLES } from '../constants/roles.js'

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    wechatOpenId: { type: String, sparse: true, unique: true },
    wechatUnionId: { type: String, default: '' },
    nickname: { type: String, default: '' },
    /** 对外可搜索的好友号（大写字母数字） */
    friendCode: { type: String, uppercase: true, trim: true },
    avatar: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    bio: { type: String, default: '' },
    email: { type: String, default: '', trim: true, lowercase: true },
    paymentQrUrl: { type: String, default: '' },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STUDENT,
    },
    regionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', default: null },
    status: { type: String, enum: ['active', 'banned', 'pending'], default: 'active' },
    studentVerified: { type: Boolean, default: false },
    studentInfo: {
      studentId: String,
      realName: String,
      enrollYear: Number,
      college: String,
    },
    merchantProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MerchantProfile', default: null },
    courierVerified: { type: Boolean, default: false },
    courierProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourierProfile', default: null },
    refreshToken: { type: String, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
    creditScore: { type: Number, default: 100, min: 0, max: 200 },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
)

userSchema.index({ phone: 1 }, { unique: true })
userSchema.index({ friendCode: 1 }, { unique: true, sparse: true })
userSchema.index({ role: 1 })
userSchema.index({ regionId: 1 })
userSchema.index({ studentVerified: 1 })
userSchema.index({ status: 1 })
userSchema.index({ nickname: 1, regionId: 1 })

export default mongoose.model('User', userSchema)
