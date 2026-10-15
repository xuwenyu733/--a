import config from '../config/index.js'
import logger from '../utils/logger.js'
import User from '../models/User.js'

/** @type {{ token: string, expiresAt: number } | null} */
let cachedToken = null

/**
 * 获取小程序 access_token（进程内缓存）
 */
export async function getMiniAccessToken() {
  const { appId, appSecret, sandbox } = config.wechat.miniProgram
  if (sandbox || !appId || !appSecret) {
    return null
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }
  const params = new URLSearchParams({
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret,
  })
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/token?${params}`)
  const data = await res.json()
  if (!data.access_token) {
    logger.warn('[wechat-shipping] 获取 access_token 失败', data)
    return null
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 7200) * 1000,
  }
  return cachedToken.token
}

function rfc3339Now() {
  const d = new Date()
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const oh = pad(Math.floor(abs / 60))
  const om = pad(abs % 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`
}

function maskPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '')
  if (p.length < 7) return p || '****'
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}

/**
 * 支付成功后向微信录入发货信息（校园二手默认「用户自提」）。
 * 失败只打日志，不影响支付成功主流程。
 *
 * @param {{
 *   paymentNo: string,
 *   transactionId: string,
 *   channel: string,
 *   buyerId: import('mongoose').Types.ObjectId|string,
 *   productTitle?: string,
 * }} opts
 */
export async function uploadShippingAfterPay(opts) {
  if (config.payment.mode !== 'live') return { skipped: true, reason: 'not_live' }
  if (opts.channel !== 'wechat') return { skipped: true, reason: 'not_wechat' }
  if (!opts.transactionId || String(opts.transactionId).startsWith('sandbox_')) {
    return { skipped: true, reason: 'sandbox_tx' }
  }

  const token = await getMiniAccessToken()
  if (!token) return { skipped: true, reason: 'no_token' }

  const buyer = await User.findById(opts.buyerId).select('wechatOpenId phone').lean()
  const openid = buyer?.wechatOpenId
  if (!openid) {
    logger.warn('[wechat-shipping] 买家无 openid，跳过发货录入', { paymentNo: opts.paymentNo })
    return { skipped: true, reason: 'no_openid' }
  }

  const itemDesc = String(opts.productTitle || '校园市集商品').slice(0, 120)
  const body = {
    order_key: {
      order_number_type: 2,
      transaction_id: opts.transactionId,
    },
    // 4=用户自提（校园面交）；无快递单号场景
    logistics_type: 4,
    delivery_mode: 1,
    shipping_list: [
      {
        item_desc: itemDesc,
        contact: {
          receiver_contact: maskPhone(buyer?.phone),
        },
      },
    ],
    upload_time: rfc3339Now(),
    payer: { openid },
  }

  const url = `https://api.weixin.qq.com/wxa/sec/order/upload_shipping_info?access_token=${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (data.errcode && data.errcode !== 0) {
    logger.warn('[wechat-shipping] 发货录入失败', {
      paymentNo: opts.paymentNo,
      errcode: data.errcode,
      errmsg: data.errmsg,
    })
    return { ok: false, ...data }
  }
  logger.info('[wechat-shipping] 发货录入成功', { paymentNo: opts.paymentNo })
  return { ok: true, ...data }
}
