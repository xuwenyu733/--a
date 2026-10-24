#!/usr/bin/env node
/**
 * 安全同步编译产物到 unpackage（跨平台，Windows 可用）
 * 用法：node scripts/sync-mp-weixin.js [dev|build]
 *
 * 用「先写临时目录再整体替换」，避免先清空目标导致开发者工具读到空项目（缺 app.json）。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const mode = process.argv[2] === 'dev' ? 'dev' : 'build'
const SRC = path.join(ROOT, `dist/${mode}/mp-weixin`)
const DEST = path.join(ROOT, 'unpackage/dist/dev/mp-weixin')
// 微信开发者工具对中文路径偶发读不到 app.json；额外同步到纯英文目录供导入
const DEST_ASCII = path.join(os.homedir(), 'dev', 'campus-mp')
const STATIC = path.join(ROOT, 'static')
/** 旧版分包残留，覆盖后仍需删掉，否则可能串包 */
const STALE_TOP = ['api', 'config', 'utils', 'constants', 'content']

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true, force: true })
}

function assertCompleteBuild(dir, label) {
  const required = ['app.js', 'app.json']
  for (const name of required) {
    if (!fs.existsSync(path.join(dir, name))) {
      throw new Error(`[sync] ${label} 不完整：缺少 ${name}（${dir}）`)
    }
  }
}

function buildStaging() {
  assertCompleteBuild(SRC, '编译源')
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'campus-mp-sync-'))
  try {
    copyTree(SRC, staging)
    if (fs.existsSync(STATIC)) {
      copyTree(STATIC, path.join(staging, 'static'))
    }
    const privateCfg = path.join(ROOT, 'project.private.config.json')
    if (fs.existsSync(privateCfg)) {
      fs.copyFileSync(privateCfg, path.join(staging, 'project.private.config.json'))
    }
    // 保留目标里已有的 private 配置（若源没有）
    assertCompleteBuild(staging, '暂存目录')
    return staging
  } catch (e) {
    fs.rmSync(staging, { recursive: true, force: true })
    throw e
  }
}

function replaceDest(dest, staging) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const bak = `${dest}.bak-${Date.now()}`
  if (fs.existsSync(dest)) {
    fs.renameSync(dest, bak)
  }
  try {
    fs.renameSync(staging, dest)
  } catch (e) {
    // rename 跨盘失败时退回 copy
    copyTree(staging, dest)
    fs.rmSync(staging, { recursive: true, force: true })
    if (!fs.existsSync(path.join(dest, 'app.json')) && fs.existsSync(bak)) {
      fs.rmSync(dest, { recursive: true, force: true })
      fs.renameSync(bak, dest)
      throw e
    }
  }
  if (fs.existsSync(bak)) {
    // 若新目录缺 private，从备份捞回
    const priv = path.join(dest, 'project.private.config.json')
    const bakPriv = path.join(bak, 'project.private.config.json')
    if (!fs.existsSync(priv) && fs.existsSync(bakPriv)) {
      fs.copyFileSync(bakPriv, priv)
    }
    fs.rmSync(bak, { recursive: true, force: true })
  }
  for (const name of STALE_TOP) {
    const p = path.join(dest, name)
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
  }
  assertCompleteBuild(dest, dest)
}

function syncTo(dest) {
  const staging = buildStaging()
  replaceDest(dest, staging)
}

if (!fs.existsSync(SRC)) {
  console.error(`[sync] 源目录不存在: ${SRC}`)
  console.error('请先运行: npm run dev:mp-weixin  或  npm run build:mp-weixin')
  process.exit(1)
}

try {
  syncTo(DEST)
  syncTo(DEST_ASCII)
} catch (e) {
  console.error(e.message || e)
  process.exit(1)
}

const appJs = path.join(DEST, 'app.js')
const appContent = fs.readFileSync(appJs, 'utf8')
if (appContent.length > 500 && /mount\s*\(\s*['"]#app['"]\s*\)/.test(appContent)) {
  console.error('[sync] 警告: app.js 体积异常且含 mount，可能被微信开发者工具改坏。')
  console.error('请关闭微信开发者工具后重新 npm run build:mp-weixin')
  process.exit(1)
}

console.log(`[sync] 已同步 ${mode} → ${DEST}`)
console.log(`[sync] 已同步 ${mode} → ${DEST_ASCII}（请用此目录打开微信开发者工具）`)
