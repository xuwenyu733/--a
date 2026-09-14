#!/usr/bin/env node
/**
 * 为现有商品统一设置库存。
 *
 * 规则：
 * - 学生发布（sellerType=student）：stock = 1
 * - 商家发布（sellerType=merchant）：stock = 100
 *
 * 用法（在 backend 目录）:
 *   node scripts/migrate-product-stock.mjs
 *   node scripts/migrate-product-stock.mjs --dry-run
 */
import mongoose from 'mongoose'
import config from '../src/config/index.js'
import Product from '../src/models/Product.js'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  await mongoose.connect(config.mongodbUri)

  const studentCount = await Product.countDocuments({ sellerType: 'student' })
  const merchantCount = await Product.countDocuments({ sellerType: 'merchant' })

  console.log(`将设置：学生商品 ${studentCount} → stock=1，商家商品 ${merchantCount} → stock=100`)

  if (!dryRun) {
    const r1 = await Product.updateMany({ sellerType: 'student' }, { $set: { stock: 1 } })
    const r2 = await Product.updateMany({ sellerType: 'merchant' }, { $set: { stock: 100 } })
    console.log(`已更新学生商品 ${r1.modifiedCount}，商家商品 ${r2.modifiedCount}`)
  } else {
    console.log('[dry-run] 未写入数据库')
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
