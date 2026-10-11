import crypto from 'crypto'
import fs from 'fs'

/**
 * 微信支付 APIv2（JSAPI / 小程序）工具：签名、XML、统一下单。
 * 不依赖第三方 SDK，便于部署与审计。
 */

export function wechatMd5Sign(params, apiKey) {
  const keys = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && String(params[k]) !== '')
    .sort()
  const stringA = keys.map((k) => `${k}=${params[k]}`).join('&')
  const stringSignTemp = `${stringA}&key=${apiKey}`
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase()
}

export function objectToXml(obj) {
  const parts = Object.entries(obj).map(([k, v]) => `<${k}><![CDATA[${v}]]></${k}>`)
  return `<xml>${parts.join('')}</xml>`
}

export function xmlToObject(xml) {
  if (!xml || typeof xml !== 'string') return {}
  const out = {}
  const re = /<(\w+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g
  let m
  while ((m = re.exec(xml))) {
    out[m[1]] = m[2] !== undefined ? m[2] : m[3]
  }
  return out
}

export function yuanToFen(amountYuan) {
  const n = Number(amountYuan)
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error('支付金额无效')
    err.code = 40000
    throw err
  }
  return Math.round(n * 100)
}

export function buildJsapiPayParams({ appId, prepayId, apiKey }) {
  const timeStamp = String(Math.floor(Date.now() / 1000))
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const pkg = `prepay_id=${prepayId}`
  const signType = 'MD5'
  const paySign = wechatMd5Sign(
    {
      appId,
      timeStamp,
      nonceStr,
      package: pkg,
      signType,
    },
    apiKey
  )
  return { timeStamp, nonceStr, package: pkg, signType, paySign }
}

function formatTimeExpire(expireAt) {
  if (!(expireAt instanceof Date) || Number.isNaN(expireAt.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  const y = expireAt.getFullYear()
  const M = pad(expireAt.getMonth() + 1)
  const d = pad(expireAt.getDate())
  const h = pad(expireAt.getHours())
  const m = pad(expireAt.getMinutes())
  const s = pad(expireAt.getSeconds())
  return `${y}${M}${d}${h}${m}${s}`
}

/** 组装统一下单公共参数（未签名） */
export function buildUnifiedOrderParams({
  appId,
  mchId,
  paymentNo,
  body,
  totalFeeFen,
  notifyUrl,
  clientIp = '127.0.0.1',
  expireAt,
  tradeType,
  openid,
  productId,
}) {
  const params = {
    appid: appId,
    mch_id: mchId,
    nonce_str: crypto.randomBytes(16).toString('hex'),
    body: String(body || '校园市集商品').slice(0, 120),
    out_trade_no: paymentNo,
    total_fee: String(totalFeeFen),
    spbill_create_ip: clientIp,
    notify_url: notifyUrl,
    trade_type: tradeType,
  }
  const timeExpire = formatTimeExpire(expireAt)
  if (timeExpire) params.time_expire = timeExpire
  if (tradeType === 'JSAPI' && openid) params.openid = openid
  if (tradeType === 'NATIVE' && productId) params.product_id = String(productId).slice(0, 32)
  return params
}

async function postUnifiedOrder(params, apiKey) {
  const signed = { ...params, sign: wechatMd5Sign(params, apiKey) }
  const res = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: objectToXml(signed),
  })
  const text = await res.text()
  const data = xmlToObject(text)
  if (data.return_code !== 'SUCCESS') {
    const err = new Error(data.return_msg || '微信统一下单通信失败')
    err.code = 50200
    err.wechat = data
    throw err
  }
  if (data.result_code !== 'SUCCESS') {
    const err = new Error(data.err_code_des || data.err_code || '微信统一下单业务失败')
    err.code = 50200
    err.wechat = data
    throw err
  }
  return data
}

export async function unifiedOrderJsapi({
  appId,
  mchId,
  apiKey,
  openid,
  paymentNo,
  body,
  totalFeeFen,
  notifyUrl,
  clientIp = '127.0.0.1',
  expireAt,
}) {
  const params = buildUnifiedOrderParams({
    appId,
    mchId,
    paymentNo,
    body,
    totalFeeFen,
    notifyUrl,
    clientIp,
    expireAt,
    tradeType: 'JSAPI',
    openid,
  })
  const data = await postUnifiedOrder(params, apiKey)
  if (!data.prepay_id) {
    const err = new Error('微信未返回 prepay_id')
    err.code = 50200
    throw err
  }
  return { prepayId: data.prepay_id, raw: data }
}

/** PC 扫码：NATIVE，返回 code_url */
export async function unifiedOrderNative({
  appId,
  mchId,
  apiKey,
  paymentNo,
  body,
  totalFeeFen,
  notifyUrl,
  clientIp = '127.0.0.1',
  expireAt,
  productId,
}) {
  const params = buildUnifiedOrderParams({
    appId,
    mchId,
    paymentNo,
    body,
    totalFeeFen,
    notifyUrl,
    clientIp,
    expireAt,
    tradeType: 'NATIVE',
    productId: productId || paymentNo,
  })
  const data = await postUnifiedOrder(params, apiKey)
  if (!data.code_url) {
    const err = new Error('微信未返回 code_url（请确认商户已开通 Native/扫码支付）')
    err.code = 50200
    throw err
  }
  return { codeUrl: data.code_url, prepayId: data.prepay_id || '', raw: data }
}

/**
 * 验签支付结果通知。body 可为 XML 字符串或已解析对象。
 */
export function verifyWechatPayNotify(body, apiKey) {
  const data = typeof body === 'string' ? xmlToObject(body) : { ...(body || {}) }
  if (!data || !data.sign) {
    return { valid: false, paymentNo: null, transactionId: null, data }
  }
  const expected = wechatMd5Sign(data, apiKey)
  if (expected !== String(data.sign).toUpperCase()) {
    return { valid: false, paymentNo: null, transactionId: null, data }
  }
  if (data.return_code !== 'SUCCESS' || data.result_code !== 'SUCCESS') {
    return { valid: false, paymentNo: null, transactionId: null, data }
  }
  return {
    valid: true,
    paymentNo: data.out_trade_no || null,
    transactionId: data.transaction_id || null,
    data,
  }
}

/** 退款等能力需要时再读证书；下单 JSAPI 仅需 APIv2 密钥 */
export function assertCertFilesOptional(certPath, keyPath) {
  if (!certPath && !keyPath) return
  if (certPath && !fs.existsSync(certPath)) {
    const err = new Error(`微信支付证书不存在: ${certPath}`)
    err.code = 50000
    throw err
  }
  if (keyPath && !fs.existsSync(keyPath)) {
    const err = new Error(`微信支付私钥不存在: ${keyPath}`)
    err.code = 50000
    throw err
  }
}
