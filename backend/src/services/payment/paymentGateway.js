import crypto from 'crypto'
import config from '../../config/index.js'
import { PAYMENT_CHANNEL, PAYMENT_PROVIDER } from '../../constants/payment.js'

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
 * 正式微信支付占位：商户号与域名就绪后在此接入 JSAPI/小程序下单。
 * createPrepay 应返回 payParams 供小程序 requestPayment。
 */
function createLiveWechatGateway() {
  return {
    provider: PAYMENT_PROVIDER.WECHAT,
    async createPrepay({ paymentNo, amount, title, openid, expireAt }) {
      if (!openid) {
        const err = new Error('微信支付需要微信登录（缺少 openid），请使用微信一键登录后再支付')
        err.code = 40000
        throw err
      }
      // TODO: 接入微信支付统一下单（JSAPI），使用：
      // config.payment.wechat.{appId,mchId,apiKey,certPath,keyPath}
      // notifyUrl: notifyUrl(PAYMENT_CHANNEL.WECHAT)
      // 成功后返回：
      // {
      //   prepayId, payParams: { timeStamp, nonceStr, package, signType, paySign },
      //   clientAction: 'requestPayment', notifyUrl, transactionId: null
      // }
      void paymentNo
      void amount
      void title
      void expireAt
      const err = new Error(
        '微信支付 live 模式待接入：请配置商户密钥并实现 paymentGateway.createLiveWechatGateway（需公网 HTTPS 回调）'
      )
      err.code = 50100
      throw err
    },
    verifyNotify() {
      // TODO: 验签微信支付回调
      return { valid: false, paymentNo: null, transactionId: null }
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
