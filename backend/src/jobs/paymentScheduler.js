import logger from '../utils/logger.js'
import { runPaymentMaintenance } from '../services/paymentService.js'

const INTERVAL_MS = 60 * 1000
let timer = null
let running = false

async function tick() {
  if (running) return
  running = true
  try {
    await runPaymentMaintenance()
  } catch (err) {
    logger.error('[payment-scheduler] 巡检失败', err?.message || err)
  } finally {
    running = false
  }
}

export function startPaymentScheduler() {
  if (timer) return
  timer = setInterval(tick, INTERVAL_MS)
  timer.unref?.()
  logger.info('[payment-scheduler] 已启动（过期支付单清理、发货上报重试）')
}

export function stopPaymentScheduler() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
