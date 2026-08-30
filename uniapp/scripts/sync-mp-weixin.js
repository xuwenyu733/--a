#!/usr/bin/env node
/**
 * 安全同步编译产物到 unpackage（避免 rm -rf 导致微信开发者工具 loader 报错）
 * 用法：node scripts/sync-mp-weixin.js [dev|build]
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const mode = process.argv[2] === 'dev' ? 'dev' : 'build'
const SRC = path.join(ROOT, `dist/${mode}/mp-weixin`)
const DEST = path.join(ROOT, 'unpackage/dist/dev/mp-weixin')
const STATIC = path.join(ROOT, 'static')

if (!fs.existsSync(SRC)) {
  console.error(`[sync] 源目录不存在: ${SRC}`)
  console.error('请先运行: npm run dev:mp-weixin  或  npm run build:mp-weixin')
  process.exit(1)
}

fs.mkdirSync(path.dirname(DEST), { recursive: true })

// rsync 增量同步，不先删整个目录，减少微信工具 loader timeout
try {
  execSync(`rsync -a --delete "${SRC}/" "${DEST}/"`, { stdio: 'inherit' })
} catch {
  // 无 rsync 时回退到 cp
  fs.mkdirSync(DEST, { recursive: true })
  execSync(`cp -R "${SRC}/." "${DEST}/"`, { stdio: 'inherit' })
}

if (fs.existsSync(STATIC)) {
  const destStatic = path.join(DEST, 'static')
  fs.mkdirSync(destStatic, { recursive: true })
  execSync(`cp -R "${STATIC}/." "${destStatic}/"`, { stdio: 'inherit' })
}

// 校验：app.js 应为精简入口（仅 export createApp），若被微信工具改坏会膨胀并内联 mount
const appJs = path.join(DEST, 'app.js')
const appContent = fs.readFileSync(appJs, 'utf8')
if (appContent.length > 500 && /mount\s*\(\s*['"]#app['"]\s*\)/.test(appContent)) {
  console.error('[sync] 警告: app.js 体积异常且含 mount，可能被微信开发者工具改坏。')
  console.error('请关闭微信开发者工具后重新 npm run build:mp-weixin')
  process.exit(1)
}

// 合并项目私有配置（避免微信工具用旧 minified 设置）
const privateCfg = path.join(ROOT, 'project.private.config.json')
if (fs.existsSync(privateCfg)) {
  fs.copyFileSync(privateCfg, path.join(DEST, 'project.private.config.json'))
}

console.log(`[sync] 已同步 ${mode} → ${DEST}`)
