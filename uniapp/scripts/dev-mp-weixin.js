#!/usr/bin/env node
/**
 * CLI 开发小程序：
 * 1. uni -p mp-weixin 监听源码变更并编译到 dist/dev/mp-weixin
 * 2. 自动同步到 unpackage/dist/dev/mp-weixin（微信开发者工具应打开此目录）
 */
const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist/dev/mp-weixin')

function sync() {
  execSync('npm run sync:mp-weixin:dev --silent', { cwd: ROOT, stdio: 'inherit' })
}

function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

const syncDebounced = debounce(() => {
  if (!fs.existsSync(DIST)) return
  const stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  console.log(`\n[mp-dev ${stamp}] 同步编译产物 → unpackage/dist/dev/mp-weixin`)
  try {
    sync()
    console.log(`[mp-dev ${stamp}] 同步完成，微信开发者工具会自动刷新\n`)
  } catch (e) {
    console.error('[mp-dev] 同步失败:', e.message)
  }
}, 600)

function startWatch() {
  syncDebounced()
  fs.watch(DIST, { recursive: true }, () => syncDebounced())
  console.log('[mp-dev] 正在监听 dist/dev/mp-weixin 变更\n')
}

function waitForFirstBuild() {
  if (fs.existsSync(DIST)) {
    startWatch()
    return
  }
  console.log('[mp-dev] 等待首次编译完成...')
  const timer = setInterval(() => {
    if (fs.existsSync(DIST)) {
      clearInterval(timer)
      startWatch()
    }
  }, 400)
}

console.log('[mp-dev] 启动 uni 编译监听 (mp-weixin)')
console.log('[mp-dev] 微信开发者工具请打开（二选一）：')
console.log('  推荐: dist/dev/mp-weixin')
console.log('  或:   unpackage/dist/dev/mp-weixin（自动同步后）\n')

const child = spawn('npx', ['uni', '-p', 'mp-weixin'], {
  cwd: ROOT,
  env: { ...process.env, UNI_INPUT_DIR: '.' },
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

waitForFirstBuild()

child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => {
  child.kill('SIGINT')
  process.exit(0)
})
