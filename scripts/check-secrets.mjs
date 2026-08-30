#!/usr/bin/env node
/**
 * 扫描仓库中可能泄露的密钥（不含 node_modules）
 * 用法：npm run check:secrets
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const PATTERNS = [
  { name: 'OpenAI/DeepSeek sk-', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'AWS Access Key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Generic API key assignment', re: /(?:api[_-]?key|secret[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{16,}/i },
]

const ALLOWLIST = [
  /\.example$/,
  /check-secrets\.mjs$/,
  /node_modules/,
  /\.git\//,
  /unpackage\//,
  /dist\//,
]

function listTrackedFiles() {
  try {
    const out = execSync('git ls-files', { cwd: root, encoding: 'utf8' })
    return out.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

function readFile(rel) {
  try {
    return execSync(`git show HEAD:${rel}`, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  } catch {
    return null
  }
}

const files = listTrackedFiles().filter((f) => !ALLOWLIST.some((re) => re.test(f)))
const hits = []

for (const file of files) {
  const content = readFile(file)
  if (!content) continue
  for (const { name, re } of PATTERNS) {
    if (re.test(content)) {
      hits.push({ file, pattern: name })
      break
    }
  }
}

if (hits.length) {
  console.error('发现疑似密钥，请检查并轮换：')
  for (const h of hits) {
    console.error(`  - ${h.file} (${h.pattern})`)
  }
  process.exit(1)
}

console.log(`secret-scan: ${files.length} 个已跟踪文件，未发现明显密钥模式`)
