import config from '../config/index.js'
import { ROLES } from '../constants/roles.js'

/** @param {unknown} phone */
export function isWechatReviewPhone(phone) {
  const p = String(phone || '').trim()
  if (!p) return false
  return config.wechatReviewPhones.includes(p)
}

/**
 * 已认证学生，或微信审核白名单手机号（仅用于提审完整体验）
 * @param {{ role?: string, studentVerified?: boolean, phone?: string } | null | undefined} user
 */
export function isVerifiedStudentBuyer(user) {
  if (!user || user.role !== ROLES.STUDENT) return false
  if (user.studentVerified) return true
  return isWechatReviewPhone(user.phone)
}
