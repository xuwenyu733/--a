import { isWechatReviewPhone } from './studentPrivilege.js'
import { syntheticPhoneFromOpenId } from '../services/wechatService.js'

/** 微信登录生成的占位手机号账号（尚未绑定真实手机） */
export function isPlaceholderWechatAccount(user) {
  if (!user) return false
  if (user.phonePlaceholder) return true
  if (!user.wechatOpenId || !user.phone) return false
  const base = syntheticPhoneFromOpenId(user.wechatOpenId)
  return user.phone === base || String(user.phone).startsWith(base.slice(0, 8))
}

/** @param {string} password */
export function validatePassword(password) {
  const MIN_PASSWORD_LENGTH = 6
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `密码至少需要 ${MIN_PASSWORD_LENGTH} 位`
  }
  if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    return '密码需要包含字母和数字'
  }
  return null
}

/**
 * @param {Record<string, unknown>} user
 * @param {{ self?: boolean }} [options]
 */
export function sanitizeUser(user, { self = false } = {}) {
  /** @type {{ toObject?: () => Record<string, unknown> } & Record<string, unknown>} */
  const u = user
  const obj = typeof u.toObject === 'function' ? u.toObject() : { ...u }
  delete obj.password
  delete obj.refreshToken
  delete obj.wechatOpenId
  delete obj.wechatUnionId
  obj.needsPhoneBind = isPlaceholderWechatAccount(user)
  delete obj.phonePlaceholder
  if (self && isWechatReviewPhone(obj.phone)) {
    obj.studentVerified = true
  }
  if (!self) {
    delete obj.paymentQrUrl
    delete obj.email
    const studentInfo = obj.studentInfo
    if (studentInfo && typeof studentInfo === 'object') {
      delete /** @type {Record<string, unknown>} */ (studentInfo).studentId
      delete /** @type {Record<string, unknown>} */ (studentInfo).realName
    }
  }
  return obj
}
