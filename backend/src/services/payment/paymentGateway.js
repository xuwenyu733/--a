import crypto from 'crypto'
import config from '../../config/index.js'
import { PAYMENT_CHANNEL, PAYMENT_PROVIDER } from '../../constants/payment.js'

/**
 * 支付网关抽象：沙箱模式用于开发联调；生产环境配置商户密钥后走 live 分支（需自行对接官方 SDK）。
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
    const err = new Error('该支付渠道未配置或不可用')
    err.code = 40000
    throw err
  }
  return createSandboxGateway(channel)
}

function createSandboxGateway(channel) {
  return {
    provider: PAYMENT_PROVIDER.SANDBOX,
    async createPrepay({ paymentNo, amount, title, expireAt }) {
      const base = config.payment.notifyBaseUrl.replace(/\/$/, '')
      return {
        prepayId: `sandbox_${paymentNo}`,
        payUrl: `${base}/api/payments/sandbox/pay?no=${encodeURIComponent(paymentNo)}`,
        qrContent: `SANDBOX|${channel}|${paymentNo}|${amount}|${title}`,
        transactionId: null,
      }
    },
    verifyNotify() {
      return { valid: true, paymentNo: null, transactionId: null }
    },
  }
}

function createLiveWechatGateway() {
  return {
    provider: PAYMENT_PROVIDER.WECHAT,
    async createPrepay() {
      const err = new Error('微信支付 live 模式需接入官方 SDK，请配置 WECHAT_PAY_* 并实现 paymentGateway')
      err.code = 50100
      throw err
    },
    verifyNotify() {
      return { valid: false, paymentNo: null, transactionId: null }
    },
  }
}

function createLiveAlipayGateway() {
  return {
    provider: PAYMENT_PROVIDER.ALIPAY,
    async createPrepay() {
      const err = new Error('支付宝 live 模式需接入官方 SDK，请配置 ALIPAY_* 并实现 paymentGateway')
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
