import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEMO_IMG_DIR = path.join(__dirname, '../../uploads/demo')

/** 1×1 占位 JPEG，网络不可用时兜底 */
const FALLBACK_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  'base64'
)

const CATEGORIES = ['book', 'electronics', 'daily', 'clothing', 'other']

function localPath(category, index) {
  const cat = CATEGORIES.includes(category) ? category : 'other'
  const n = ((Number(index) - 1) % 3) + 1
  return `/uploads/demo/${cat}-${n}.jpg`
}

function hashTitle(title) {
  return String(title).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

/** 演示商品封面（同源 /uploads，小程序可加载） */
export function imagesForProduct(title, count = 1, category = 'other') {
  const n = Math.min(Math.max(count, 1), 3)
  const base = (hashTitle(title) % 3) + 1
  return Array.from({ length: n }, (_, i) => localPath(category, base + i))
}

/** 确保 uploads/demo 下有各类别占位图 */
export async function ensureDemoImageFiles() {
  fs.mkdirSync(DEMO_IMG_DIR, { recursive: true })

  for (const cat of CATEGORIES) {
    for (let i = 1; i <= 3; i++) {
      const filename = `${cat}-${i}.jpg`
      const filepath = path.join(DEMO_IMG_DIR, filename)
      if (fs.existsSync(filepath) && fs.statSync(filepath).size > 1000) continue

      try {
        const res = await fetch(`https://picsum.photos/seed/campus-demo-${cat}-${i}/600/600`, {
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          if (buf.length > 100) {
            fs.writeFileSync(filepath, buf)
            continue
          }
        }
      } catch {
        /* 离线时用内置占位图 */
      }
      fs.writeFileSync(filepath, FALLBACK_JPEG)
    }
  }
}

export function needsLocalImageMigration(images) {
  if (!Array.isArray(images) || !images.length) return true
  return images.some((img) => typeof img === 'string' && /^https?:\/\//.test(img))
}
