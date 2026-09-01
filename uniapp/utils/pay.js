/**
 * 小程序支付调起封装。
 * - 沙箱：无 payParams，走「模拟支付成功」接口
 * - live：后端返回 payParams 后调用本方法
 */
export function requestWechatPayment(payParams) {
  if (!payParams?.timeStamp || !payParams?.package || !payParams?.paySign) {
    return Promise.reject(new Error('支付参数不完整'))
  }
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: String(payParams.timeStamp),
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType || 'RSA',
      paySign: payParams.paySign,
      success: (res) => resolve(res),
      fail: (err) => {
        const msg = err?.errMsg || ''
        if (/cancel/i.test(msg)) {
          reject(new Error('已取消支付'))
        } else {
          reject(new Error(msg || '支付失败'))
        }
      },
    })
  })
}

/** 创建支付单后根据后端指示执行：模拟 or 调起微信 */
export async function continuePayment(createResult, { onSimulate } = {}) {
  const action = createResult?.clientAction
  const payParams = createResult?.payment?.payParams
  if (action === 'requestPayment' || payParams) {
    await requestWechatPayment(payParams)
    return { type: 'wechat' }
  }
  if (action === 'simulate' || createResult?.sandbox) {
    if (typeof onSimulate === 'function') {
      await onSimulate(createResult.payment?.paymentNo)
      return { type: 'simulate' }
    }
    return { type: 'await_simulate', paymentNo: createResult.payment?.paymentNo }
  }
  throw new Error('当前无法发起支付，请稍后重试或使用线下转账')
}
