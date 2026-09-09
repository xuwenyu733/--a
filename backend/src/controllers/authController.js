import config from '../config/index.js'
import * as authService from '../services/authService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../utils/authCookie.js'
import { isMiniProgramClient } from '../utils/clientType.js'

function buildAuthData(req, { user, accessToken, refreshToken }) {
  const data = { user, accessToken }
  if (isMiniProgramClient(req) && refreshToken) {
    data.refreshToken = refreshToken
  }
  return data
}

export async function sendCode(req, res, next) {
  try {
    const { phone } = req.body
    if (!phone) return fail(res, ErrorCodes.BAD_REQUEST, '请输入手机号')
    // 开发环境固定验证码
    return success(res, { code: config.devSmsCode }, '验证码已发送（开发模式）')
  } catch (err) {
    next(err)
  }
}

export async function register(req, res, next) {
  try {
    const { phone, password, code, nickname, regionId } = req.body
    if (!phone || !password || !regionId) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请填写完整信息')
    }
    if (code !== config.devSmsCode) {
      return fail(res, ErrorCodes.BAD_REQUEST, '验证码错误')
    }
    const user = await authService.register({ phone, password, nickname, regionId })
    const { accessToken, refreshToken } = await authService.issueTokens(user)
    setRefreshTokenCookie(res, refreshToken)
    const populated = await user.populate('regionId', 'name code')
    return success(res, buildAuthData(req, {
      user: authService.sanitizeUser(populated, { self: false }),
      accessToken,
      refreshToken,
    }), '注册成功')
  } catch (err) {
    if (err.code === 11000) return next(err)
    if (err.code) return fail(res, err.code, err.message, err.code >= 50000 ? 500 : 400)
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请输入手机号和密码')
    }
    const { user, accessToken, refreshToken } = await authService.login({ phone, password })
    setRefreshTokenCookie(res, refreshToken)
    const populated = await user.populate('regionId', 'name code')
    return success(res, buildAuthData(req, {
      user: authService.sanitizeUser(populated, { self: false }),
      accessToken,
      refreshToken,
    }), '登录成功')
  } catch (err) {
    if (err.code === ErrorCodes.LOGIN_FAILED) {
      return fail(res, err.code, err.message, 400)
    }
    if (err.code === ErrorCodes.FORBIDDEN) {
      return fail(res, err.code, err.message, 403)
    }
    if (err.code) return fail(res, err.code, err.message, 401)
    next(err)
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token = getRefreshTokenFromRequest(req)
    if (!token) return fail(res, ErrorCodes.BAD_REQUEST, '缺少 refreshToken')
    const { accessToken, user } = await authService.refreshAccessToken(token)
    const populated = await user.populate('regionId', 'name code')
    return success(res, {
      accessToken,
      user: authService.sanitizeUser(populated, { self: false }),
    })
  } catch (err) {
    return fail(res, ErrorCodes.UNAUTHORIZED, 'refreshToken 无效', 401)
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.user._id)
    clearRefreshTokenCookie(res)
    return success(res, null, '已退出登录')
  } catch (err) {
    next(err)
  }
}

export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body
    await authService.changePassword(req.user._id, { oldPassword, newPassword })
    return success(res, null, '密码已修改')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 400)
    next(err)
  }
}

export async function wechatLogin(req, res, next) {
  try {
    const { code, regionId, nickname } = req.body
    const { user, accessToken, refreshToken, isNewUser } = await authService.wechatLogin({
      code,
      regionId,
      nickname,
    })
    const populated = await user.populate('regionId', 'name code')
    return success(
      res,
      buildAuthData(req, {
        user: authService.sanitizeUser(populated, { self: false }),
        accessToken,
        refreshToken,
        isNewUser,
      }),
      isNewUser ? '注册并登录成功' : '登录成功'
    )
  } catch (err) {
    if (err.code === 40010) return fail(res, err.code, err.message, 400)
    if (err.code) return fail(res, err.code, err.message, err.code >= 50000 ? 500 : 400)
    next(err)
  }
}

export async function getMe(req, res, next) {
  try {
    const { ensureFriendCode } = await import('../services/friendService.js')
    await ensureFriendCode(req.user)
    const user = await req.user.populate('regionId', 'name code')
    let merchantProfile = null
    if (user.merchantProfileId) {
      const MerchantProfile = (await import('../models/MerchantProfile.js')).default
      merchantProfile = await MerchantProfile.findById(user.merchantProfileId)
    }
    return success(res, {
      user: authService.sanitizeUser(user, { self: true }),
      merchantProfile,
    })
  } catch (err) {
    next(err)
  }
}
