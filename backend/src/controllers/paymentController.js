import * as paymentService from '../services/paymentService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

export function config(req, res) {
  return success(res, paymentService.getPaymentConfig(req.user))
}

export async function createForOrder(req, res, next) {
  try {
    const { channel } = req.body
    if (!channel) return fail(res, ErrorCodes.BAD_REQUEST, '请选择支付方式')
    const data = await paymentService.createOnlinePayment(req.params.orderId, req.user._id, {
      channel,
    })
    return success(res, data, '支付单已创建')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : err.code >= 40300 ? 403 : 400)
    next(err)
  }
}

export async function activeForOrder(req, res, next) {
  try {
    const { order, payment } = await paymentService.getActivePayment(req.params.orderId, req.user._id)
    const payCfg = paymentService.getPaymentConfig(req.user)
    return success(res, {
      order: {
        _id: order._id,
        paymentStatus: order.paymentStatus,
        latestPaymentNo: order.latestPaymentNo,
        price: order.price,
      },
      payment: payment
        ? {
            paymentNo: payment.paymentNo,
            amount: payment.amount,
            channel: payment.channel,
            status: payment.status,
            payUrl: payment.payUrl,
            qrContent: payment.qrContent,
            expiredAt: payment.expiredAt,
            provider: payment.provider,
            payParams: payment.payParams || null,
          }
        : null,
      sandbox: payCfg.sandboxSimulate,
      mode: payCfg.mode,
      clientAction: payment?.payParams
        ? 'requestPayment'
        : payCfg.sandboxSimulate
          ? 'simulate'
          : null,
    })
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function detail(req, res, next) {
  try {
    const tx = await paymentService.getPaymentByNo(req.params.paymentNo, req.user._id)
    return success(res, tx)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function simulatePay(req, res, next) {
  try {
    const data = await paymentService.simulateSandboxPayment(req.params.paymentNo, req.user._id)
    return success(res, data, '支付成功')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : err.code >= 40300 ? 403 : 400)
    next(err)
  }
}

export async function notifyWechat(req, res) {
  const result = await paymentService.handlePaymentNotify('wechat', req.body)
  if (result.ok) return res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>')
  return res.status(400).send('FAIL')
}

export async function notifyAlipay(req, res) {
  const result = await paymentService.handlePaymentNotify('alipay', req.body)
  if (result.ok) return res.send('success')
  return res.status(400).send('fail')
}

export async function sandboxPayPage(req, res) {
  try {
    const tx = await paymentService.getSandboxPayPage(req.query.no)
    if (!tx) return res.status(404).send('支付单不存在')
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>沙箱支付</title><style>body{font-family:system-ui,sans-serif;max-width:420px;margin:40px auto;padding:0 16px}h1{font-size:20px}.amt{color:#f56c6c;font-size:28px;font-weight:700}p{color:#606266;line-height:1.6}.tip{background:#ecf5ff;padding:12px;border-radius:8px;font-size:14px}</style></head><body><h1>校园市集 · 沙箱支付</h1><p>支付单号：<code>${tx.paymentNo}</code></p><p class="amt">¥${tx.amount}</p><p>渠道：${tx.channel === 'wechat' ? '微信支付' : '支付宝'}</p><div class="tip">此为开发环境模拟页。请返回订单页点击「模拟支付成功」，或调用 API：<code>POST /api/payments/${tx.paymentNo}/simulate</code></div></body></html>`
    res.type('html').send(html)
  } catch {
    res.status(500).send('error')
  }
}
