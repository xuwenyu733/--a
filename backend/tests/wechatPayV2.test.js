import { describe, it, expect } from 'vitest'
import {
  buildJsapiPayParams,
  buildUnifiedOrderParams,
  objectToXml,
  verifyWechatPayNotify,
  wechatMd5Sign,
  xmlToObject,
  yuanToFen,
} from '../src/services/payment/wechatPayV2.js'

describe('wechatPayV2', () => {
  const apiKey = '192006250b4c09247ec02edce69f6a2d'

  it('wechatMd5Sign matches WeChat sample style', () => {
    const sign = wechatMd5Sign(
      {
        appid: 'wxd930ea5d5a258f4f',
        mch_id: '10000100',
        nonce_str: 'ibuaiVcKdpRxkhJA',
        body: 'test',
        out_trade_no: '1415659990',
        total_fee: '1',
        spbill_create_ip: '192.168.2.1',
        notify_url: 'http://www.weixin.qq.com/notify',
        trade_type: 'JSAPI',
      },
      apiKey
    )
    expect(sign).toMatch(/^[A-F0-9]{32}$/)
  })

  it('xml roundtrip', () => {
    const xml = objectToXml({ return_code: 'SUCCESS', out_trade_no: 'PAYABC' })
    expect(xml).toContain('<![CDATA[SUCCESS]]>')
    const obj = xmlToObject(xml)
    expect(obj.return_code).toBe('SUCCESS')
    expect(obj.out_trade_no).toBe('PAYABC')
  })

  it('yuanToFen', () => {
    expect(yuanToFen(0.01)).toBe(1)
    expect(yuanToFen(12.34)).toBe(1234)
  })

  it('buildJsapiPayParams has required fields', () => {
    const p = buildJsapiPayParams({ appId: 'wxAPP', prepayId: 'wx123', apiKey })
    expect(p.package).toBe('prepay_id=wx123')
    expect(p.signType).toBe('MD5')
    expect(p.paySign).toMatch(/^[A-F0-9]{32}$/)
  })

  it('verifyWechatPayNotify accepts signed SUCCESS', () => {
    const data = {
      return_code: 'SUCCESS',
      result_code: 'SUCCESS',
      out_trade_no: 'PAY1',
      transaction_id: 'TX1',
      mch_id: '10000100',
    }
    data.sign = wechatMd5Sign(data, apiKey)
    const xml = objectToXml(data)
    const r = verifyWechatPayNotify(xml, apiKey)
    expect(r.valid).toBe(true)
    expect(r.paymentNo).toBe('PAY1')
    expect(r.transactionId).toBe('TX1')
  })

  it('verifyWechatPayNotify rejects bad sign', () => {
    const r = verifyWechatPayNotify(
      objectToXml({
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'PAY1',
        sign: 'DEADBEEF',
      }),
      apiKey
    )
    expect(r.valid).toBe(false)
  })

  it('buildUnifiedOrderParams for NATIVE has no openid and includes product_id', () => {
    const params = buildUnifiedOrderParams({
      appId: 'wxAPP',
      mchId: '1750738602',
      paymentNo: 'PAYNATIVE1',
      body: '测试商品',
      totalFeeFen: 1,
      notifyUrl: 'https://xymarket.cn/api/v1/payments/notify/wechat',
      tradeType: 'NATIVE',
      productId: 'PAYNATIVE1',
    })
    expect(params.trade_type).toBe('NATIVE')
    expect(params.openid).toBeUndefined()
    expect(params.product_id).toBe('PAYNATIVE1')
    expect(params.total_fee).toBe('1')
  })

  it('buildUnifiedOrderParams for JSAPI includes openid', () => {
    const params = buildUnifiedOrderParams({
      appId: 'wxAPP',
      mchId: '1750738602',
      paymentNo: 'PAYJSAPI1',
      body: '测试',
      totalFeeFen: 100,
      notifyUrl: 'https://xymarket.cn/api/v1/payments/notify/wechat',
      tradeType: 'JSAPI',
      openid: 'oTEST',
    })
    expect(params.trade_type).toBe('JSAPI')
    expect(params.openid).toBe('oTEST')
  })
})
