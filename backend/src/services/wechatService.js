import crypto from 'crypto'
import config from '../config/index.js'

/**
 * 小程序 code 换 openid（正式环境调微信接口；开发环境用 code 生成稳定沙箱 openid）
 */
export async function code2Session(code) {
  const { appId, appSecret, sandbox } = config.wechat.miniProgram

  if (sandbox || !appId || !appSecret) {
    const openid = `sandbox_${crypto.createHash('sha256').update(String(code)).digest('hex').slice(0, 28)}`
    return { openid, unionid: '', sessionKey: 'sandbox' }
  }

  const params = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: 'authorization_code',
  })
  const res = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params}`)
  const data = await res.json()
  if (data.errcode) {
    const err = new Error(data.errmsg || '微信登录失败')
    err.code = 40000
    throw err
  }
  return {
    openid: data.openid,
    unionid: data.unionid || '',
    sessionKey: data.session_key,
  }
}

/** 为微信新用户生成符合 1\d{10} 的占位手机号 */
export function syntheticPhoneFromOpenId(openid) {
  const hash = crypto.createHash('md5').update(openid).digest('hex')
  const nine = hash.replace(/\D/g, '').slice(0, 9).padEnd(9, '0')
  return `19${nine.slice(0, 9)}`
}
