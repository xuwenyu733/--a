#!/usr/bin/env node
/**
 * 安全同步编译产物到 unpackage（跨平台，Windows 可用）
 * 用法：node scripts/sync-mp-weixin.js [dev|build]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const mode = process.argv[2] === 'dev' ? 'dev' : 'build'
const SRC = path.join(ROOT, `dist/${mode}/mp-weixin`)
const DEST = path.join(ROOT, 'unpackage/dist/dev/mp-weixin')
const STATIC = path.join(ROOT, 'static')

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true, force: true })
}

if (!fs.existsSync(SRC)) {
  console.error(`[sync] 源目录不存在: ${SRC}`)
  console.error('请先运行: npm run dev:mp-weixin  或  npm run build:mp-weixin')
  process.exit(1)
}

copyTree(SRC, DEST)

if (fs.existsSync(STATIC)) {
  copyTree(STATIC, path.join(DEST, 'static'))
}

const appJs = path.join(DEST, 'app.js')
const appContent = fs.readFileSync(appJs, 'utf8')
if (appContent.length > 500 && /mount\s*\(\s*['"]#app['"]\s*\)/.test(appContent)) {
  console.error('[sync] 警告: app.js 体积异常且含 mount，可能被微信开发者工具改坏。')
  console.error('请关闭微信开发者工具后重新 npm run build:mp-weixin')
  process.exit(1)
}

const privateCfg = path.join(ROOT, 'project.private.config.json')
if (fs.existsSync(privateCfg)) {
  fs.copyFileSync(privateCfg, path.join(DEST, 'project.private.config.json'))
}

console.log(`[sync] 已同步 ${mode} → ${DEST}`)
