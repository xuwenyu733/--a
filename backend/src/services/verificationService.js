import User from '../models/User.js'
import Verification from '../models/Verification.js'
import MerchantProfile from '../models/MerchantProfile.js'
import CourierProfile from '../models/CourierProfile.js'
import { ROLES } from '../constants/roles.js'
import { createAuditLog } from './auditService.js'

export async function submitStudentVerification(user, payload) {
  if (user.role !== ROLES.STUDENT) {
    const err = new Error('仅学生可提交学生认证')
    err.code = 40301
    throw err
  }
  if (user.studentVerified) {
    const err = new Error('已完成学生认证')
    err.code = 40900
    throw err
  }
  const pending = await Verification.findOne({
    userId: user._id,
    type: 'student',
    status: 'pending',
  })
  if (pending) {
    const err = new Error('已有待审核的学生认证申请')
    err.code = 40900
    throw err
  }
  return Verification.create({
    userId: user._id,
    regionId: user.regionId,
    type: 'student',
    payload,
  })
}

export async function submitMerchantVerification(user, payload) {
  if (user.role !== ROLES.STUDENT) {
    const err = new Error('仅学生可申请商家入驻')
    err.code = 40301
    throw err
  }
  const pending = await Verification.findOne({
    userId: user._id,
    type: 'merchant',
    status: 'pending',
  })
  if (pending) {
    const err = new Error('已有待审核的商家入驻申请')
    err.code = 40900
    throw err
  }
  return Verification.create({
    userId: user._id,
    regionId: user.regionId,
    type: 'merchant',
    payload,
  })
}

export async function submitCourierVerification(user, payload) {
  if (!user.regionId) {
    const err = new Error('请先完善所属校区')
    err.code = 40000
    throw err
  }
  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.REGIONAL_AGENT) {
    const err = new Error('当前账号不可申请骑手')
    err.code = 40301
    throw err
  }
  if (user.courierVerified) {
    const err = new Error('已是认证骑手')
    err.code = 40900
    throw err
  }
  const pending = await Verification.findOne({
    userId: user._id,
    type: 'courier',
    status: 'pending',
  })
  if (pending) {
    const err = new Error('已有待审核的骑手申请')
    err.code = 40900
    throw err
  }
  return Verification.create({
    userId: user._id,
    regionId: user.regionId,
    type: 'courier',
    payload,
  })
}

export async function reviewVerification(verificationId, reviewer, { status, rejectReason }) {
  const verification = await Verification.findById(verificationId).populate('userId')
  if (!verification) {
    const err = new Error('申请不存在')
    err.code = 40400
    throw err
  }
  if (verification.status !== 'pending') {
    const err = new Error('该申请已处理')
    err.code = 40900
    throw err
  }
  if (reviewer.role === ROLES.REGIONAL_AGENT) {
    if (verification.regionId.toString() !== reviewer.regionId?.toString()) {
      const err = new Error('无权审核其他区域')
      err.code = 40302
      throw err
    }
  }
  verification.status = status
  verification.rejectReason = rejectReason || ''
  verification.reviewerId = reviewer._id
  verification.reviewedAt = new Date()
  await verification.save()

  const user = await User.findById(verification.userId)

  if (status === 'approved') {
    if (verification.type === 'student') {
      user.studentVerified = true
      user.studentInfo = verification.payload
      await user.save()
    } else if (verification.type === 'merchant') {
      const profile = await MerchantProfile.create({
        userId: user._id,
        regionId: user.regionId,
        shopName: verification.payload.shopName,
        contactPhone: verification.payload.contactPhone || user.phone,
        address: verification.payload.address || '',
        businessLicense: verification.payload.businessLicense || '',
        licenseImage: verification.payload.licenseImage || '',
        description: verification.payload.description || '',
        status: 'active',
      })
      user.role = ROLES.MERCHANT
      user.merchantProfileId = profile._id
      await user.save()
    } else if (verification.type === 'courier') {
      const profile = await CourierProfile.create({
        userId: user._id,
        regionId: user.regionId,
        realName: verification.payload.realName,
        contactPhone: verification.payload.contactPhone || user.phone,
        serviceTypes: verification.payload.serviceTypes || ['food', 'express'],
        intro: verification.payload.intro || '',
        allowedZoneIds: verification.payload.allowedZoneIds || [],
        status: 'active',
      })
      user.courierVerified = true
      user.courierProfileId = profile._id
      await user.save()
    }
  }

  await createAuditLog({
    operator: reviewer,
    action: `${status}_${verification.type}_verification`,
    targetType: 'verification',
    targetId: verification._id,
    detail: { status, rejectReason },
  })

  return verification
}

export async function getVerificationStatus(userId) {
  const list = await Verification.find({ userId }).sort({ createdAt: -1 }).limit(10)
  const student = list.find((v) => v.type === 'student')
  const merchant = list.find((v) => v.type === 'merchant')
  const courier = list.find((v) => v.type === 'courier')
  const user = await User.findById(userId)
  return {
    studentVerified: user?.studentVerified || false,
    courierVerified: user?.courierVerified || false,
    role: user?.role,
    student: student || null,
    merchant: merchant || null,
    courier: courier || null,
  }
}
