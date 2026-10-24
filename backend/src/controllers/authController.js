import * as authService from '../services/authService.js'
import * as smsCodeService from '../services/smsCodeService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../utils/authCookie.js'
import { isMiniProgramClient } from '../utils/clientType.js'

function buildAuthData(req, { user, accessToken, refreshToken, ...extra }) {
  const data = { user, accessToken, ...extra }
  if (isMiniProgramClient(req) && refreshToken) {
    data.refreshToken = refreshToken
  }
  return data
}

export async function sendCode(req, res, next) {
  try {
    const { phone, purpose } = req.body
    if (!phone) return fail(res, ErrorCodes.BAD_REQUEST, '请输入手机号')
    const result = await smsCodeService.issueSmsCode(phone, { purpose })
    return success(res, result, '验证码已发送')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code >= 50000 ? 502 : 400)
    next(err)
  }
}

export async function register(req, res, next) {
  try {
    const { phone, password, code, nickname, regionId } = req.body
    if (!phone || !password || !regionId) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请填写完整信息')
    }
    try {
      await smsCodeService.consumeSmsCode(phone, code)
    } catch (e) {
      return fail(res, e.code || ErrorCodes.BAD_REQUEST, e.message || '验证码错误')
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

export async function loginByCode(req, res, next) {
  try {
    const { phone, code } = req.body
    if (!phone || !code) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请输入手机号和验证码')
    }
    try {
      await smsCodeService.consumeSmsCode(phone, code)
    } catch (e) {
      return fail(res, e.code || ErrorCodes.BAD_REQUEST, e.message || '验证码错误')
    }
    const { user, accessToken, refreshToken } = await authService.loginByCode({ phone })
    setRefreshTokenCookie(res, refreshToken)
    const populated = await user.populate('regionId', 'name code')
    return success(
      res,
      buildAuthData(req, {
        user: authService.sanitizeUser(populated, { self: false }),
        accessToken,
        refreshToken,
      }),
      '登录成功'
    )
  } catch (err) {
    if (err.code === ErrorCodes.FORBIDDEN) {
      return fail(res, err.code, err.message, 403)
    }
    if (err.code) return fail(res, err.code, err.message, 400)
    next(err)
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token = getRefreshTokenFromRequest(req)
    if (!token) return fail(res, ErrorCodes.BAD_REQUEST, '缺少 refreshToken')
    const { accessToken, refreshToken: newRefreshToken, user } =
      await authService.refreshAccessToken(token)
    setRefreshTokenCookie(res, newRefreshToken)
    const populated = await user.populate('regionId', 'name code')
    return success(
      res,
      buildAuthData(req, {
        user: authService.sanitizeUser(populated, { self: false }),
        accessToken,
        refreshToken: newRefreshToken,
      })
    )
  } catch (err) {
    clearRefreshTokenCookie(res)
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

export async function resetPassword(req, res, next) {
  try {
    const { phone, code, newPassword } = req.body
    try {
      await smsCodeService.consumeSmsCode(phone, code)
    } catch (e) {
      return fail(res, e.code || ErrorCodes.BAD_REQUEST, e.message || '验证码错误')
    }
    await authService.resetPasswordByCode({ phone, newPassword })
    return success(res, null, '密码已重置，请使用新密码登录')
  } catch (err) {
    if (err.code === ErrorCodes.FORBIDDEN) {
      return fail(res, err.code, err.message, 403)
    }
    if (err.code) return fail(res, err.code, err.message, 400)
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

export async function bindPhone(req, res, next) {
  try {
    const { phone, code } = req.body
    try {
      await smsCodeService.consumeSmsCode(phone, code)
    } catch (e) {
      return fail(res, e.code || ErrorCodes.BAD_REQUEST, e.message || '验证码错误')
    }
    const { user, accessToken, refreshToken, merged } = await authService.bindPhone(req.user._id, {
      phone,
    })
    setRefreshTokenCookie(res, refreshToken)
    const populated = await user.populate('regionId', 'name code')
    return success(
      res,
      buildAuthData(req, {
        user: authService.sanitizeUser(populated, { self: true }),
        accessToken,
        refreshToken,
        merged,
      }),
      merged ? '已合并到该手机号账号' : '手机号绑定成功'
    )
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40300 ? 403 : 400)
    next(err)
  }
}

export async function bindWechat(req, res, next) {
  try {
    const { code } = req.body
    const { user, accessToken, refreshToken } = await authService.bindWechat(req.user._id, { code })
    setRefreshTokenCookie(res, refreshToken)
    const populated = await user.populate('regionId', 'name code')
    return success(
      res,
      buildAuthData(req, {
        user: authService.sanitizeUser(populated, { self: true }),
        accessToken,
        refreshToken,
      }),
      '微信绑定成功'
    )
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, 400)
    next(err)
  }
}
