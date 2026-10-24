import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import UserAddress from '../models/UserAddress.js'
import Region from '../models/Region.js'
import { ROLES } from '../constants/roles.js'
import { buildTokenPayload, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { code2Session, syntheticPhoneFromOpenId } from './wechatService.js'
import { validatePassword, sanitizeUser, isPlaceholderWechatAccount } from '../utils/authHelpers.js'
import { generateFriendCode } from '../utils/friendCode.js'
import { ErrorCodes } from '../utils/response.js'

export { validatePassword, sanitizeUser }

const SALT_ROUNDS = 10

async function allocateFriendCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = generateFriendCode(8)
    const exists = await User.exists({ friendCode: code })
    if (!exists) return code
  }
  const err = new Error('好友号生成失败')
  err.code = ErrorCodes.SERVER_ERROR
  throw err
}

export async function register({ phone, password, nickname, regionId }) {
  const pwdError = validatePassword(password)
  if (pwdError) {
    const err = new Error(pwdError)
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }
  const exists = await User.findOne({ phone })
  if (exists) {
    const err = new Error('手机号已注册')
    err.code = ErrorCodes.CONFLICT
    throw err
  }
  const region = await Region.findById(regionId)
  if (!region || region.status !== 'active') {
    const err = new Error('无效的区域')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await User.create({
    phone,
    password: hashed,
    nickname: nickname || `用户${phone.slice(-4)}`,
    friendCode: await allocateFriendCode(),
    role: ROLES.STUDENT,
    regionId,
  })
  return user
}

export async function login({ phone, password }) {
  const user = await User.findOne({ phone }).select('+password +refreshToken')
  if (!user) {
    const err = new Error('手机号或密码错误')
    err.code = ErrorCodes.LOGIN_FAILED
    throw err
  }
  if (user.status === 'banned') {
    const err = new Error('账号已被封禁')
    err.code = ErrorCodes.FORBIDDEN
    throw err
  }
  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    const err = new Error('手机号或密码错误')
    err.code = ErrorCodes.LOGIN_FAILED
    throw err
  }
  const tokens = await issueTokens(user)
  user.lastLoginAt = new Date()
  await user.save()
  return { user, ...tokens }
}

/** 手机号 + 短信验证码登录（验证码须已由 consumeSmsCode 消费） */
export async function loginByCode({ phone }) {
  const user = await User.findOne({ phone }).select('+refreshToken')
  if (!user) {
    const err = new Error('该手机号未注册，请先注册')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }
  if (user.status === 'banned') {
    const err = new Error('账号已被封禁')
    err.code = ErrorCodes.FORBIDDEN
    throw err
  }
  const tokens = await issueTokens(user)
  user.lastLoginAt = new Date()
  await user.save()
  return { user, ...tokens }
}

export async function issueTokens(user) {
  const payload = buildTokenPayload(user)
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)
  user.refreshToken = refreshToken
  await user.save()
  return { accessToken, refreshToken }
}

export async function refreshAccessToken(refreshToken) {
  let decoded
  try {
    decoded = verifyRefreshToken(refreshToken)
  } catch {
    const err = new Error('无效的 refreshToken')
    err.code = 40100
    throw err
  }

  const user = await User.findById(decoded.userId).select('+refreshToken')
  if (!user || user.status === 'banned') {
    const err = new Error('无效的 refreshToken')
    err.code = 40100
    throw err
  }

  // 复用检测：库中已轮换过，却仍用旧 token → 清空会话
  if (!user.refreshToken || user.refreshToken !== refreshToken) {
    if (user.refreshToken) {
      await User.findByIdAndUpdate(user._id, { refreshToken: null })
    }
    const err = new Error('无效的 refreshToken')
    err.code = 40100
    throw err
  }

  const payload = buildTokenPayload(user)
  const accessToken = signAccessToken(payload)
  const newRefreshToken = signRefreshToken(payload)

  const updated = await User.findOneAndUpdate(
    { _id: user._id, refreshToken },
    { $set: { refreshToken: newRefreshToken } },
    { new: true }
  )
  if (!updated) {
    await User.findByIdAndUpdate(user._id, { refreshToken: null })
    const err = new Error('无效的 refreshToken')
    err.code = 40100
    throw err
  }

  return { accessToken, refreshToken: newRefreshToken, user: updated }
}

export async function logout(userId) {
  await User.findByIdAndUpdate(userId, { refreshToken: null })
}

export async function changePassword(userId, { oldPassword, newPassword }) {
  const pwdError = validatePassword(newPassword)
  if (pwdError) {
    const err = new Error(pwdError)
    err.code = 40000
    throw err
  }
  const user = await User.findById(userId).select('+password')
  if (!user) {
    const err = new Error('用户不存在')
    err.code = 40400
    throw err
  }
  const match = await bcrypt.compare(oldPassword, user.password)
  if (!match) {
    const err = new Error('当前密码不正确')
    err.code = 40000
    throw err
  }
  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS)
  user.mustChangePassword = false
  await user.save()
  return user
}

/** 手机号 + 短信验证码重置密码（验证码须已由 consumeSmsCode 消费） */
export async function resetPasswordByCode({ phone, newPassword }) {
  const pwdError = validatePassword(newPassword)
  if (pwdError) {
    const err = new Error(pwdError)
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }
  const user = await User.findOne({ phone }).select('+password +refreshToken')
  if (!user) {
    const err = new Error('该手机号未注册')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }
  if (user.status === 'banned') {
    const err = new Error('账号已被封禁')
    err.code = ErrorCodes.FORBIDDEN
    throw err
  }
  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS)
  user.mustChangePassword = false
  user.refreshToken = null
  await user.save()
  return user
}

export async function wechatLogin({ code, regionId, nickname }) {
  const { openid, unionid } = await code2Session(code)

  let user = await User.findOne({ wechatOpenId: openid }).select('+password +refreshToken')
  if (user) {
    if (user.status === 'banned') {
      const err = new Error('账号已被封禁')
      err.code = 40300
      throw err
    }
    const tokens = await issueTokens(user)
    user.lastLoginAt = new Date()
    await user.save()
    return { user, ...tokens, isNewUser: false }
  }

  if (!regionId) {
    const err = new Error('请选择校区完成首次登录')
    err.code = 40010
    throw err
  }

  const region = await Region.findById(regionId)
  if (!region || region.status !== 'active') {
    const err = new Error('无效的区域')
    err.code = 40000
    throw err
  }

  let phone = syntheticPhoneFromOpenId(openid)
  let suffix = 0
  while (await User.findOne({ phone })) {
    suffix += 1
    phone = syntheticPhoneFromOpenId(`${openid}_${suffix}`)
  }

  const hashed = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), SALT_ROUNDS)
  user = await User.create({
    phone,
    phonePlaceholder: true,
    password: hashed,
    nickname: nickname?.trim() || `微信用户${phone.slice(-4)}`,
    friendCode: await allocateFriendCode(),
    wechatOpenId: openid,
    wechatUnionId: unionid || '',
    role: ROLES.STUDENT,
    regionId,
  })

  const tokens = await issueTokens(user)
  user.lastLoginAt = new Date()
  await user.save()
  return { user, ...tokens, isNewUser: true }
}

/** 微信用户绑定真实手机号；若该手机号已有账号则合并（地址等迁过去） */
export async function bindPhone(userId, { phone }) {
  const current = await User.findById(userId).select('+password +refreshToken')
  if (!current) {
    const err = new Error('用户不存在')
    err.code = 40400
    throw err
  }
  if (!isPlaceholderWechatAccount(current) && current.phone === phone) {
    current.phonePlaceholder = false
    await current.save()
    const tokens = await issueTokens(current)
    return { user: current, ...tokens, merged: false }
  }
  if (!isPlaceholderWechatAccount(current) && current.phone !== phone) {
    const err = new Error('当前账号已绑定手机号，如需更换请联系客服')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }

  const existing = await User.findOne({ phone }).select('+password +refreshToken')
  if (existing && String(existing._id) !== String(current._id)) {
    if (existing.status === 'banned') {
      const err = new Error('该手机号账号已被封禁')
      err.code = ErrorCodes.FORBIDDEN
      throw err
    }
    if (existing.wechatOpenId && existing.wechatOpenId !== current.wechatOpenId) {
      const err = new Error('该手机号已绑定其他微信，请用手机号登录')
      err.code = ErrorCodes.BAD_REQUEST
      throw err
    }

    const openid = current.wechatOpenId
    const unionid = current.wechatUnionId || ''
    await UserAddress.updateMany({ userId: current._id }, { $set: { userId: existing._id } })
    // 先释放 openid 唯一索引，再挂到手机号账号并删除占位用户
    await User.updateOne({ _id: current._id }, { $unset: { wechatOpenId: 1 }, $set: { wechatUnionId: '' } })

    existing.wechatOpenId = openid
    existing.wechatUnionId = unionid || existing.wechatUnionId || ''
    existing.phonePlaceholder = false
    if (!existing.nickname || String(existing.nickname).startsWith('微信用户')) {
      existing.nickname = current.nickname || existing.nickname
    }
    if (!existing.avatar && current.avatar) existing.avatar = current.avatar
    if (!existing.regionId && current.regionId) existing.regionId = current.regionId
    existing.lastLoginAt = new Date()
    await existing.save()
    await User.deleteOne({ _id: current._id })

    const tokens = await issueTokens(existing)
    return { user: existing, ...tokens, merged: true }
  }

  current.phone = phone
  current.phonePlaceholder = false
  await current.save()
  const tokens = await issueTokens(current)
  return { user: current, ...tokens, merged: false }
}

/** 手机号账号绑定当前微信，之后可用微信一键登录回到同一账号 */
export async function bindWechat(userId, { code }) {
  const user = await User.findById(userId).select('+password +refreshToken')
  if (!user) {
    const err = new Error('用户不存在')
    err.code = 40400
    throw err
  }
  if (isPlaceholderWechatAccount(user)) {
    const err = new Error('请先绑定手机号')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }

  const { openid, unionid } = await code2Session(code)
  const occupied = await User.findOne({ wechatOpenId: openid })
  if (occupied && String(occupied._id) !== String(user._id)) {
    if (isPlaceholderWechatAccount(occupied)) {
      await UserAddress.updateMany({ userId: occupied._id }, { $set: { userId: user._id } })
      await User.updateOne({ _id: occupied._id }, { $unset: { wechatOpenId: 1 } })
      await User.deleteOne({ _id: occupied._id })
    } else {
      const err = new Error('该微信已绑定其他账号')
      err.code = ErrorCodes.BAD_REQUEST
      throw err
    }
  }

  user.wechatOpenId = openid
  user.wechatUnionId = unionid || user.wechatUnionId || ''
  user.phonePlaceholder = false
  await user.save()
  const tokens = await issueTokens(user)
  return { user, ...tokens }
}
