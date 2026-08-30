#!/usr/bin/env node
/**
 * API 冒烟测试：需 MongoDB + 已 seed，服务运行在 BASE_URL
 * 用法：node scripts/smoke-api.mjs
 *       SMOKE_BASE_URL=http://127.0.0.1:3001/api node scripts/smoke-api.mjs
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001/api'

const ACCOUNTS = [
  { name: '学生', phone: '13800000003', password: 'student123', tests: studentTests },
  { name: '商家', phone: '13800000002', password: 'merchant123', tests: merchantTests },
  { name: '区域代理', phone: '13800000001', password: 'agent123456', tests: agentTests },
  { name: '超管', phone: '13800000000', password: 'admin123456', tests: adminTests },
]

let passed = 0
let failed = 0

function ok(label) {
  passed++
  console.log(`  ✓ ${label}`)
}

function fail(label, detail) {
  failed++
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ''}`)
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let json
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { status: res.status, json }
}

async function login(phone, password) {
  const { status, json } = await api('/auth/login', {
    method: 'POST',
    body: { phone, password },
  })
  if (status !== 200 || json?.code !== 0 || !json?.data?.accessToken) {
    throw new Error(json?.message || `HTTP ${status}`)
  }
  return json.data.accessToken
}

async function studentTests(token) {
  const me = await api('/auth/me', { token })
  if (me.json?.code !== 0 || !me.json.data?.user) {
    fail('GET /auth/me', me.json?.message)
    return
  }
  ok('GET /auth/me')
  const regionId = me.json.data.user.regionId?._id || me.json.data.user.regionId
  const regionQ = regionId ? `&regionId=${regionId}` : ''

  const products = await api(`/products?page=1&pageSize=5${regionQ}`, { token })
  if (products.json?.code === 0) ok('GET /products 列表')
  else fail('GET /products', products.json?.message)

  const groupBuy = await api(`/products?groupBuyOnly=true&page=1&pageSize=5${regionQ}`, { token })
  if (groupBuy.json?.code === 0) ok('GET /products?groupBuyOnly=true')
  else fail('GET /products?groupBuyOnly', groupBuy.json?.message)

  const rec = await api(`/products/recommended?limit=4${regionQ}`, { token })
  if (rec.json?.code === 0) ok('GET /products/recommended')
  else fail('GET /products/recommended', rec.json?.message)

  const conv = await api('/chat/conversations', { token })
  if (conv.json?.code === 0) ok('GET /chat/conversations')
  else fail('GET /chat/conversations', conv.json?.message)

  const orders = await api('/orders', { token })
  if (orders.json?.code === 0) ok('GET /orders')
  else fail('GET /orders', orders.json?.message)

  const notif = await api('/notifications', { token })
  if (notif.json?.code === 0) ok('GET /notifications')
  else fail('GET /notifications', notif.json?.message)

  const resumeHist = await api('/resume/history', { token })
  if (resumeHist.json?.code === 0) ok('GET /resume/history')
  else fail('GET /resume/history', resumeHist.json?.message)

  const regionId = me.json.data.user.regionId?._id || me.json.data.user.regionId
  if (regionId) {
    const zones = await api(`/delivery/zones?regionId=${regionId}`, { token })
    if (zones.json?.code === 0) ok('GET /delivery/zones')
    else fail('GET /delivery/zones', zones.json?.message)
  }

  const deliveryOrders = await api('/delivery/orders', { token })
  if (deliveryOrders.json?.code === 0) ok('GET /delivery/orders')
  else fail('GET /delivery/orders', deliveryOrders.json?.message)
}

async function merchantTests(token) {
  const shop = await api('/merchant/shop', { token })
  if (shop.json?.code === 0) ok('GET /merchant/shop')
  else fail('GET /merchant/shop', shop.json?.message)

  const stats = await api('/merchant/stats', { token })
  if (stats.json?.code === 0) ok('GET /merchant/stats')
  else fail('GET /merchant/stats', stats.json?.message)

  const mine = await api('/products/mine', { token })
  if (mine.json?.code === 0) ok('GET /products/mine')
  else fail('GET /products/mine', mine.json?.message)
}

async function agentTests(token) {
  const dash = await api('/agent/dashboard', { token })
  if (dash.json?.code === 0) ok('GET /agent/dashboard')
  else fail('GET /agent/dashboard', dash.json?.message)

  const ver = await api('/agent/verifications?type=courier&status=pending', { token })
  if (ver.json?.code === 0) ok('GET /agent/verifications')
  else fail('GET /agent/verifications', ver.json?.message)

  const dz = await api('/agent/delivery-zones?pageSize=10', { token })
  if (dz.json?.code === 0) ok('GET /agent/delivery-zones')
  else fail('GET /agent/delivery-zones', dz.json?.message)

  const reports = await api('/reports?page=1', { token })
  if (reports.json?.code === 0) ok('GET /reports')
  else fail('GET /reports', reports.json?.message)
}

async function adminTests(token) {
  const dash = await api('/admin/dashboard', { token })
  if (dash.json?.code === 0) ok('GET /admin/dashboard')
  else fail('GET /admin/dashboard', dash.json?.message)

  const regions = await api('/admin/regions', { token })
  if (regions.json?.code === 0) ok('GET /admin/regions')
  else fail('GET /admin/regions', regions.json?.message)

  const products = await api('/admin/products?page=1', { token })
  if (products.json?.code === 0) ok('GET /admin/products')
  else fail('GET /admin/products', products.json?.message)

  const cfg = await api('/config/platform')
  if (cfg.json?.code === 0) ok('GET /config/platform')
  else fail('GET /config/platform', cfg.json?.message)

  const dz = await api('/admin/delivery-zones?pageSize=5', { token })
  if (dz.json?.code === 0) ok('GET /admin/delivery-zones')
  else fail('GET /admin/delivery-zones', dz.json?.message)
}

async function main() {
  console.log(`\n🔍 API 冒烟测试 → ${BASE}\n`)

  const health = await api('/health')
  if (health.json?.code === 0) {
    ok('GET /health')
  } else {
    fail('GET /health', health.json?.message || `HTTP ${health.status}`)
    console.error('\n请先启动服务：cd backend && npm run dev\n')
    process.exit(1)
    
  }

  const meta = await api('/products/meta')
  if (meta.json?.code === 0) ok('GET /products/meta（公开）')
  else fail('GET /products/meta', meta.json?.message)

  for (const acc of ACCOUNTS) {
    console.log(`\n▶ ${acc.name}（${acc.phone}）`)
    try {
      const token = await login(acc.phone, acc.password)
      ok('POST /auth/login')
      await acc.tests(token)
    } catch (e) {
      fail('登录或角色测试', e.message)
    }
  }

  console.log(`\n──────────────`)
  console.log(`通过 ${passed}，失败 ${failed}`)
  if (failed > 0) process.exit(1)
  console.log('全部通过 ✓\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
