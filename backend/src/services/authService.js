import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Region from '../models/Region.js'
import { ROLES } from '../constants/roles.js'
import { buildTokenPayload, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { code2Session, syntheticPhoneFromOpenId } from './wechatService.js'
import { validatePassword, sanitizeUser } from '../utils/authHelpers.js'
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
