#!/usr/bin/env node
/**
 * 为 uploads/ 下已有图片补生成 WebP 缩略图。
 *
 * 用法（在 backend 目录）:
 *   node scripts/backfill-thumbnails.mjs           # 仅处理缺失缩略图
 *   node scripts/backfill-thumbnails.mjs --dry-run   # 预览将处理的文件
 *   node scripts/backfill-thumbnails.mjs --force   # 覆盖已有缩略图
 */
import fs from 'fs'
import path from 'path'
import { defaultUploadDir } from '../src/middlewares/multerStorage.js'
import {
  generateThumbnailForFile,
  absoluteThumbPath,
  isImageUploadPath,
} from '../src/utils/imageThumb.js'
import { uploadPathToThumbPath } from '../../shared/thumbUrlCore.js'

const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')

async function main() {
  if (!fs.existsSync(defaultUploadDir)) {
    console.log('uploads 目录不存在，跳过')
    return
  }

  const entries = fs.readdirSync(defaultUploadDir, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile()).map((e) => e.name)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const file of files) {
    const dbPath = `/uploads/${file}`
    if (!isImageUploadPath(dbPath)) continue

    const thumbAbs = absoluteThumbPath(uploadPathToThumbPath(dbPath), defaultUploadDir)
    if (!force && fs.existsSync(thumbAbs)) {
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`[dry-run] ${dbPath} -> ${uploadPathToThumbPath(dbPath)}`)
      created++
      continue
    }

    try {
      const src = path.join(defaultUploadDir, file)
      await generateThumbnailForFile(src, dbPath, { uploadDir: defaultUploadDir })
      console.log(`✓ ${file}`)
      created++
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`)
      failed++
    }
  }

  console.log('')
  console.log(`完成：生成 ${created}，跳过 ${skipped}，失败 ${failed}${dryRun ? '（预览模式）' : ''}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
