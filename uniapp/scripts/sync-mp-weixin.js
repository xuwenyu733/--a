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
// 微信开发者工具对中文路径偶发读不到 app.json；额外同步到纯英文目录供导入
const DEST_ASCII = path.join(require('os').homedir(), 'dev', 'campus-mp')
const STATIC = path.join(ROOT, 'static')

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true, force: true })
}

function syncTo(dest) {
  copyTree(SRC, dest)
  if (fs.existsSync(STATIC)) {
    copyTree(STATIC, path.join(dest, 'static'))
  }
  const privateCfg = path.join(ROOT, 'project.private.config.json')
  if (fs.existsSync(privateCfg)) {
    fs.copyFileSync(privateCfg, path.join(dest, 'project.private.config.json'))
  }
}

if (!fs.existsSync(SRC)) {
  console.error(`[sync] 源目录不存在: ${SRC}`)
  console.error('请先运行: npm run dev:mp-weixin  或  npm run build:mp-weixin')
  process.exit(1)
}

syncTo(DEST)
syncTo(DEST_ASCII)

const appJs = path.join(DEST, 'app.js')
const appContent = fs.readFileSync(appJs, 'utf8')
if (appContent.length > 500 && /mount\s*\(\s*['"]#app['"]\s*\)/.test(appContent)) {
  console.error('[sync] 警告: app.js 体积异常且含 mount，可能被微信开发者工具改坏。')
  console.error('请关闭微信开发者工具后重新 npm run build:mp-weixin')
  process.exit(1)
}

console.log(`[sync] 已同步 ${mode} → ${DEST}`)
console.log(`[sync] 已同步 ${mode} → ${DEST_ASCII}（请用此目录打开微信开发者工具）`)
