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
