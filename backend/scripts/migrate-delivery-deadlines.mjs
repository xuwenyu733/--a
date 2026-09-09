#!/usr/bin/env node
/**
 * 为历史跑腿订单补全 deliveryTimeType / deliveryDeadlineStart / deliveryDeadlineEnd。
 *
 * 规则：
 * - 已完成/已取消：createdAt + 30min（视为 ASAP）
 * - 其余 open/accepted/delivering：createdAt + 30min（视为 ASAP）
 * - 已错误迁移为「查看时刻+30min」的 open/accepted/delivering ASAP 单会按 createdAt 纠正
 *
 * 用法（在 backend 目录）:
 *   node scripts/migrate-delivery-deadlines.mjs
 *   node scripts/migrate-delivery-deadlines.mjs --dry-run
 */
import mongoose from 'mongoose'
import config from '../src/config/index.js'
import DeliveryOrder from '../src/models/DeliveryOrder.js'
import { resolveLegacyDeliveryDeadlines } from '../../shared/deliveryTimeCore.js'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  await mongoose.connect(config.mongodbUri)
  const now = new Date()
  const cursor = DeliveryOrder.find({
    $or: [
      { deliveryDeadlineEnd: null },
      { deliveryTimeType: null },
    ],
  }).cursor()

  let updated = 0
  for await (const order of cursor) {
    const deadlines = resolveLegacyDeliveryDeadlines(order, now)
    if (dryRun) {
      console.log(`[dry-run] ${order._id} -> ${deadlines.deliveryTimeType} ${deadlines.deliveryDeadlineEnd.toISOString()}`)
    } else {
      await DeliveryOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            deliveryTimeType: deadlines.deliveryTimeType,
            deliveryDeadlineStart: deadlines.deliveryDeadlineStart,
            deliveryDeadlineEnd: deadlines.deliveryDeadlineEnd,
          },
        }
      )
    }
    updated += 1
  }

  const misaligned = await DeliveryOrder.find({
    status: { $in: ['open', 'accepted', 'delivering'] },
    deliveryTimeType: 'asap',
    deliveryDeadlineStart: { $exists: true },
    createdAt: { $exists: true },
  })
  let realigned = 0
  for (const order of misaligned) {
    const created = new Date(order.createdAt)
    const start = new Date(order.deliveryDeadlineStart)
    if (Math.abs(start.getTime() - created.getTime()) <= 120000) continue
    const deadlines = resolveLegacyDeliveryDeadlines(order, now)
    if (dryRun) {
      console.log(`[dry-run] realign ${order._id} -> ${deadlines.deliveryDeadlineEnd.toISOString()}`)
    } else {
      await DeliveryOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            deliveryTimeType: deadlines.deliveryTimeType,
            deliveryDeadlineStart: deadlines.deliveryDeadlineStart,
            deliveryDeadlineEnd: deadlines.deliveryDeadlineEnd,
          },
        }
      )
    }
    realigned += 1
  }

  console.log(
    dryRun
      ? `[dry-run] 将补全 ${updated} 条，纠正错位 ASAP ${realigned} 条`
      : `已补全 ${updated} 条，纠正错位 ASAP ${realigned} 条`
  )
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
