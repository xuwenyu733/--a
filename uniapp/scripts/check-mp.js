#!/usr/bin/env node
/**
 * 小程序联调前自检：后端 API + 编译产物
 * 用法：node scripts/check-mp.js
 */
const fs = require('fs')
const path = require('path')
const http = require('http')

const ROOT = path.resolve(__dirname, '..')
const MP_DIR = path.join(ROOT, 'unpackage/dist/dev/mp-weixin')
const API = 'http://127.0.0.1:3001'

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { reject(new Error(`invalid json: ${url}`)) }
      })
    }).on('error', reject)
  })
}

async function main() {
  let ok = true
  const fail = (msg) => { ok = false; console.error('✗', msg) }
  const pass = (msg) => console.log('✓', msg)

  // 1. 编译产物
  const required = [
    'app.json',
    'app.js',
    'common/vendor.js',
    'pages/index/index.js',
    'pages/index/index.wxml',
    'project.config.json',
  ]
  for (const f of required) {
    const p = path.join(MP_DIR, f)
    if (!fs.existsSync(p)) fail(`缺少编译文件: ${f}`)
    else pass(`编译文件存在: ${f}`)
  }

  const libVer = JSON.parse(fs.readFileSync(path.join(MP_DIR, 'project.config.json'), 'utf8')).libVersion
  if (libVer && libVer !== '3.15.0' && !String(libVer).startsWith('3.15.')) pass(`project.config libVersion=${libVer}`)
  else console.warn('⚠ 3.15.x 灰度基础库易导致模拟器失败，建议切到 3.8.12 等稳定版，当前=', libVer)

  const wxml = fs.readFileSync(path.join(MP_DIR, 'pages/index/index.wxml'), 'utf8')
  if (wxml.includes('hero-title') && wxml.includes('banner-slide')) pass('首页 wxml 含 hero + banner')
  else fail('首页 wxml 结构异常')

  // 2. 后端 API
  try {
    const health = await get(`${API}/api/health`)
    if (health.code === 0) pass(`后端健康: ${API}`)
    else fail(`后端 health 异常: ${JSON.stringify(health)}`)
  } catch (e) {
    fail(`后端未启动: ${API} (${e.message}) — 请先 npm run dev`)
  }

  try {
    const regions = await get(`${API}/api/regions`)
    const rid = regions.data?.[0]?._id
    if (!rid) fail('regions 为空')
    else {
      pass(`regions: ${regions.data[0].name}`)
      const products = await get(`${API}/api/products?regionId=${rid}&page=1&pageSize=2`)
      if (products.code === 0) pass(`products: ${products.data?.list?.length || 0} 条`)
      else fail(`products: ${products.message}`)
    }
  } catch (e) {
    fail(`API 请求失败: ${e.message}`)
  }

  console.log('')
  if (ok) {
    console.log('自检通过。请在微信开发者工具导入：')
    console.log(`  ${MP_DIR}`)
    console.log('并确认：详情 → 本地设置 → 不校验合法域名 + 调试基础库 3.8.12（勿用 3.15.x 灰度版）')
  } else {
    process.exit(1)
  }
}

main()
