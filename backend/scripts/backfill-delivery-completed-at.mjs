#!/usr/bin/env node
/**
 * 【一次性历史数据修正，勿重复执行】
 *
 * 功能上线前已有若干 completed 订单缺少合理的 completedAt。
 * 本脚本仅用于那次迁移：把 completedAt 设为「预计截止 − 10 分钟」。
 *
 * 此后新完成的订单：completedAt 由骑手点击「确认完成」时写入，与此脚本无关。
 *
 * 用法（在 backend 目录）:
 *   node scripts/backfill-delivery-completed-at.mjs --dry-run
 */
import mongoose from 'mongoose'
import config from '../src/config/index.js'
import DeliveryOrder from '../src/models/DeliveryOrder.js'
import { normalizeDeliveryDeadlines } from '../../shared/deliveryTimeCore.js'

/** 仅本脚本使用，不是业务规则 */
const BACKFILL_MINUTES_BEFORE_EXPECTED_END = 10

const dryRun = process.argv.includes('--dry-run')

async function main() {
  await mongoose.connect(config.mongodbUri)
  const now = new Date()
  const orders = await DeliveryOrder.find({ status: 'completed' })
  let updated = 0

  for (const order of orders) {
    const { deliveryDeadlineEnd } = normalizeDeliveryDeadlines(order, now)
    const completedAt = new Date(
      deliveryDeadlineEnd.getTime() - BACKFILL_MINUTES_BEFORE_EXPECTED_END * 60000
    )
    if (dryRun) {
      console.log(
        `[dry-run] ${order._id} ${order.title || ''} -> ${completedAt.toISOString()}`
      )
    } else {
      await DeliveryOrder.updateOne({ _id: order._id }, { $set: { completedAt } })
    }
    updated += 1
  }

  console.log(dryRun ? `[dry-run] 将更新 ${updated} 条` : `已更新 ${updated} 条（一次性回填）`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
