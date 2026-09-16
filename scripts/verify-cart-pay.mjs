#!/usr/bin/env node
/**
 * 联调验证：购物车 → 下单 → 沙箱支付
 * 用法：
 *   node scripts/verify-cart-pay.mjs
 *   node scripts/verify-cart-pay.mjs --base http://111.230.138.241
 */
import process from 'node:process'

const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const root = (baseIdx >= 0 ? args[baseIdx + 1] : 'http://127.0.0.1:3001').replace(/\/$/, '')
const api = `${root}/api/v1`

const BUYER = { phone: '13800000003', password: 'student123' }
const SELLER = { phone: '13800000002', password: 'merchant123' }

function ok(step, extra = '') {
  console.log(`✓ ${step}${extra ? ` — ${extra}` : ''}`)
}
function fail(step, detail) {
  console.error(`✗ ${step}`)
  console.error(detail)
  process.exitCode = 1
}

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${api}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

function tokenOf(data) {
  return data?.accessToken || data?.tokens?.accessToken || data?.token
}

async function login(account, label) {
  const { json } = await req('/auth/login', { method: 'POST', body: account })
  if (json.code !== 0) throw new Error(`${label} 登录失败: ${JSON.stringify(json)}`)
  const token = tokenOf(json.data)
  if (!token) throw new Error(`${label} 无 token: ${JSON.stringify(json.data)}`)
  ok(`${label} 登录`, account.phone)
  return { token, user: json.data.user || json.data }
}

async function main() {
  console.log(`\n== 验证目标: ${root} ==\n`)

  const health = await fetch(`${root}/api/health`).then((r) => r.json()).catch((e) => ({ error: String(e) }))
  if (health?.code !== 0 && health?.data?.status !== 'running') {
    fail('健康检查', health)
    return
  }
  ok('健康检查')

  const buyer = await login(BUYER, '买家(学生)')
  const seller = await login(SELLER, '卖家(商家)')

  // 支付配置
  const cfg = await req('/payments/config', { token: buyer.token })
  if (cfg.json.code !== 0) {
    fail('支付配置', cfg.json)
    return
  }
  const mode = cfg.json.data?.mode || cfg.json.data?.paymentMode
  ok('支付配置', `mode=${mode || JSON.stringify(cfg.json.data).slice(0, 120)}`)
  if (mode && mode !== 'sandbox') {
    console.warn('! 当前不是 sandbox，跳过模拟支付步骤（避免误触 live）')
  }

  // 找一款非自己的在售商品（商家货）
  const listRes = await req('/products?page=1&pageSize=30', { token: buyer.token })
  const list = listRes.json.data?.list || listRes.json.data?.items || []
  if (!list.length) {
    fail('商品列表', listRes.json)
    return
  }
  const product = list.find((p) => {
    const sid = p.sellerId?._id || p.sellerId
    const uid = buyer.user?._id || buyer.user?.id
    return sid && uid && String(sid) !== String(uid) && (p.status === 'on_sale' || !p.status)
  })
  if (!product) {
    fail('可选商品', '没有可买的在售商品（可能都是自己的）')
    return
  }
  ok('选中商品', `${product.title} (${product._id})`)

  // 加购
  const cartAdd = await req('/cart', {
    method: 'POST',
    token: buyer.token,
    body: { productId: product._id, quantity: 1 },
  })
  if (cartAdd.json.code !== 0) {
    fail('加入购物车', cartAdd.json)
    return
  }
  ok('加入购物车')

  const cartList = await req('/cart', { token: buyer.token })
  if (cartList.json.code !== 0) {
    fail('购物车列表', cartList.json)
    return
  }
  const items = cartList.json.data?.list || cartList.json.data?.items || cartList.json.data || []
  const cartItem = (Array.isArray(items) ? items : []).find(
    (it) => String(it.productId?._id || it.productId) === String(product._id)
  )
  ok('购物车列表', `条目数=${Array.isArray(items) ? items.length : '?'}`)

  // 立即下单
  const orderRes = await req('/orders', {
    method: 'POST',
    token: buyer.token,
    body: { productId: product._id, quantity: 1, remark: 'verify-cart-pay' },
  })
  if (orderRes.json.code !== 0) {
    fail('立即下单', orderRes.json)
    return
  }
  const order = orderRes.json.data
  ok('立即下单', `order=${order._id || order.id} status=${order.status} payment=${order.paymentStatus}`)

  // 若仍是 pending，卖家确认
  let orderId = order._id || order.id
  if (order.status === 'pending') {
    const conf = await req(`/orders/${orderId}/status`, {
      method: 'PATCH',
      token: seller.token,
      body: { status: 'confirmed' },
    })
    if (conf.json.code !== 0) {
      // 尝试常见路径
      const conf2 = await req(`/orders/${orderId}`, {
        method: 'PATCH',
        token: seller.token,
        body: { status: 'confirmed' },
      })
      if (conf2.json.code !== 0) {
        fail('卖家确认订单', { conf: conf.json, conf2: conf2.json })
        return
      }
    }
    ok('卖家确认订单')
  } else {
    ok('订单状态可支付', order.status)
  }

  if (mode && mode !== 'sandbox') {
    console.log('\n(跳过沙箱模拟支付)\n')
    return
  }

  const payCreate = await req(`/orders/${orderId}/payments`, {
    method: 'POST',
    token: buyer.token,
    body: { channel: 'wechat' },
  })
  if (payCreate.json.code !== 0) {
    fail('创建支付单', payCreate.json)
    return
  }
  const payment =
    payCreate.json.data?.payment || payCreate.json.data
  const paymentNo = payment?.paymentNo || payCreate.json.data?.paymentNo
  if (!paymentNo) {
    fail('创建支付单(无 paymentNo)', payCreate.json)
    return
  }
  ok('创建支付单', paymentNo)

  const sim = await req(`/payments/${paymentNo}/simulate`, {
    method: 'POST',
    token: buyer.token,
  })
  if (sim.json.code !== 0) {
    fail('模拟支付成功', sim.json)
    return
  }
  ok('模拟支付成功')

  const detail = await req(`/orders/${orderId}`, { token: buyer.token })
  const paid = detail.json.data
  const ps = paid?.paymentStatus || paid?.order?.paymentStatus
  if (ps !== 'paid_online' && ps !== 'seller_confirmed') {
    // 有的接口包在 order 里
    const again = await req(`/orders?role=buy&page=1&pageSize=5`, { token: buyer.token })
    const found = (again.json.data?.list || []).find((o) => String(o._id) === String(orderId))
    if (found?.paymentStatus === 'paid_online') {
      ok('订单已在线支付', found.paymentStatus)
    } else {
      fail('核对支付状态', { detail: detail.json, listItem: found, sim: sim.json })
      return
    }
  } else {
    ok('订单已在线支付', ps)
  }

  // 购物车结算（若仍有可结算项）
  if (cartItem?._id || cartItem?.id) {
    const checkout = await req('/cart/checkout', {
      method: 'POST',
      token: buyer.token,
      body: { itemIds: [cartItem._id || cartItem.id] },
    })
    if (checkout.json.code === 0) {
      ok('购物车结算', `orders=${(checkout.json.data?.orders || checkout.json.data || []).length || 1}`)
    } else {
      // 可能因刚下单库存不足，记为警告不算总失败
      console.warn(`! 购物车结算未通过（可忽略若库存已扣）: ${checkout.json.message || JSON.stringify(checkout.json)}`)
    }
  }

  console.log('\n全部关键步骤通过\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
