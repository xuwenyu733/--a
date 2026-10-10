import crypto from 'crypto'
import config from '../../config/index.js'
import { PAYMENT_CHANNEL, PAYMENT_PROVIDER } from '../../constants/payment.js'
import {
  assertCertFilesOptional,
  buildJsapiPayParams,
  unifiedOrderJsapi,
  verifyWechatPayNotify,
  yuanToFen,
} from './wechatPayV2.js'

/**
 * 支付网关抽象：
 * - sandbox：个体户/商户号未就绪时本地联调
 * - live：配置 WECHAT_PAY_* / ALIPAY_* 后对接官方 SDK（域名与 HTTPS 就绪后再切换）
 *
 * 小程序正式支付返回 payParams，供前端 uni.requestPayment 使用：
 * { timeStamp, nonceStr, package, signType, paySign }
 */
export function getPaymentGateway(channel) {
  const mode = config.payment.mode
  if (mode === 'live') {
    if (channel === PAYMENT_CHANNEL.WECHAT && config.payment.wechat.enabled) {
      return createLiveWechatGateway()
    }
    if (channel === PAYMENT_CHANNEL.ALIPAY && config.payment.alipay.enabled) {
      return createLiveAlipayGateway()
    }
    const err = new Error('该支付渠道未配置或不可用（请检查商户号与 PAYMENT_MODE=live）')
    err.code = 40000
    throw err
  }
  return createSandboxGateway(channel)
}

function notifyUrl(channel) {
  const base = config.payment.notifyBaseUrl.replace(/\/$/, '')
  const path = channel === PAYMENT_CHANNEL.ALIPAY ? 'alipay' : 'wechat'
  return `${base}/api/v1/payments/notify/${path}`
}

function createSandboxGateway(channel) {
  return {
    provider: PAYMENT_PROVIDER.SANDBOX,
    async createPrepay({ paymentNo, amount, title }) {
      const base = config.payment.notifyBaseUrl.replace(/\/$/, '')
      return {
        prepayId: `sandbox_${paymentNo}`,
        payUrl: `${base}/api/v1/payments/sandbox/pay?no=${encodeURIComponent(paymentNo)}`,
        qrContent: `SANDBOX|${channel}|${paymentNo}|${amount}|${title}`,
        /** 沙箱不调起微信，由前端点「模拟支付成功」 */
        payParams: null,
        clientAction: 'simulate',
        notifyUrl: notifyUrl(channel),
        transactionId: null,
      }
    },
    verifyNotify() {
      return { valid: true, paymentNo: null, transactionId: null }
    },
  }
}

/**
 * 正式微信支付：APIv2 统一下单（JSAPI）+ 回调验签。
 * createPrepay 返回 payParams 供小程序 uni.requestPayment。
 */
function createLiveWechatGateway() {
  const wc = config.payment.wechat
  return {
    provider: PAYMENT_PROVIDER.WECHAT,
    async createPrepay({ paymentNo, amount, title, openid, expireAt, clientIp }) {
      if (!openid) {
        const err = new Error('微信支付需要微信登录（缺少 openid），请使用微信一键登录后再支付')
        err.code = 40000
        throw err
      }
      if (!wc.appId || !wc.mchId || !wc.apiKey) {
        const err = new Error('微信支付未配置完整（AppID / 商户号 / API 密钥）')
        err.code = 50000
        throw err
      }
      if (!isNotifyDomainReady()) {
        const err = new Error('正式支付需要公网 HTTPS 回调域名，请配置 PAYMENT_NOTIFY_BASE_URL 或 PUBLIC_BASE_URL')
        err.code = 50000
        throw err
      }
      assertCertFilesOptional(wc.certPath, wc.keyPath)

      const notify = notifyUrl(PAYMENT_CHANNEL.WECHAT)
      const { prepayId } = await unifiedOrderJsapi({
        appId: wc.appId,
        mchId: wc.mchId,
        apiKey: wc.apiKey,
        openid,
        paymentNo,
        body: title || '校园市集商品',
        totalFeeFen: yuanToFen(amount),
        notifyUrl: notify,
        clientIp: clientIp || '127.0.0.1',
        expireAt,
      })
      const payParams = buildJsapiPayParams({
        appId: wc.appId,
        prepayId,
        apiKey: wc.apiKey,
      })
      return {
        prepayId,
        payUrl: null,
        qrContent: null,
        payParams,
        clientAction: 'requestPayment',
        notifyUrl: notify,
        transactionId: null,
      }
    },
    verifyNotify(body) {
      return verifyWechatPayNotify(body, wc.apiKey)
    },
  }
}

function createLiveAlipayGateway() {
  return {
    provider: PAYMENT_PROVIDER.ALIPAY,
    async createPrepay() {
      const err = new Error(
        '支付宝 live 模式待接入：可后补；当前建议小程序优先走微信支付'
      )
      err.code = 50100
      throw err
    },
    verifyNotify() {
      return { valid: false, paymentNo: null, transactionId: null }
    },
  }
}

export function generatePaymentNo() {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `PAY${ts}${rand}`
}

export function isNotifyDomainReady(notifyBaseUrl = config.payment.notifyBaseUrl) {
  const url = (notifyBaseUrl || '').toLowerCase()
  if (!url.startsWith('https://')) return false
  if (url.includes('localhost') || url.includes('127.0.0.1')) return false
  if (url.includes('your-domain')) return false
  return true
}
