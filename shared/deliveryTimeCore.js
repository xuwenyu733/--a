/** 跑腿可预约时段：每天 8:00 - 22:00，每 30 分钟一档 */
export const DELIVERY_SERVICE_START_MIN = 8 * 60
export const DELIVERY_SERVICE_END_MIN = 22 * 60
export const DELIVERY_SLOT_MINUTES = 30
export const DELIVERY_ASAP_OFFSET_MIN = 30
/** 尽快送达可选：当前时刻 >= 8:00 且 +30min <= 22:00，即最晚 21:30 前发布 */
export const DELIVERY_ASAP_LATEST_START_MIN = 21 * 60 + 30

export const DELIVERY_TIME_TYPE = {
  ASAP: 'asap',
  SLOT: 'slot',
}

/** 与 backend DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED 保持一致 */
export const DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED = '系统：超过预计送达时间未接单'

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function formatHm(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function getMinutesOfDay(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.getHours() * 60 + d.getMinutes()
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function setMinutesOnDate(dayDate, minutesFromMidnight) {
  const d = startOfDay(dayDate)
  d.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0)
  return d
}

export function isAsapAvailable(now = new Date()) {
  const mins = getMinutesOfDay(now)
  const asapEnd = new Date(now.getTime() + DELIVERY_ASAP_OFFSET_MIN * 60000)
  const endMins = getMinutesOfDay(asapEnd)
  return (
    mins >= DELIVERY_SERVICE_START_MIN &&
    mins <= DELIVERY_ASAP_LATEST_START_MIN &&
    endMins <= DELIVERY_SERVICE_END_MIN
  )
}

function nextSlotStartMinutes(now) {
  const mins = getMinutesOfDay(now)
  return Math.ceil(mins / DELIVERY_SLOT_MINUTES) * DELIVERY_SLOT_MINUTES
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

/** 非今日时段前缀，如 9月9日；今日则返回空字符串 */
export function formatSlotDatePrefix(date, now = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime()) || isSameDay(d, now)) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatSlotLabel(deadlineStart, deadlineEnd, now = new Date()) {
  const prefix = formatSlotDatePrefix(deadlineStart, now)
  return `${prefix}${formatHm(deadlineStart)}-${formatHm(deadlineEnd)}`
}

/** 构建发布页可选时段（含尽快送达 + 今日/明日半小时间隔） */
export function buildDeliveryTimeOptions(now = new Date()) {
  const options = []
  const nowMs = now.getTime()

  if (isAsapAvailable(now)) {
    const deadlineEnd = new Date(nowMs + DELIVERY_ASAP_OFFSET_MIN * 60000)
    options.push({
      key: 'asap',
      type: DELIVERY_TIME_TYPE.ASAP,
      label: `尽快送达（${formatHm(deadlineEnd)}）`,
      deadlineStart: new Date(now),
      deadlineEnd,
    })
  }

  const days = [startOfDay(now), startOfDay(addDays(now, 1))]
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex]
    let slotStartMin = DELIVERY_SERVICE_START_MIN
    if (dayIndex === 0) {
      slotStartMin = Math.max(DELIVERY_SERVICE_START_MIN, nextSlotStartMinutes(now))
    }
    for (let slot = slotStartMin; slot < DELIVERY_SERVICE_END_MIN; slot += DELIVERY_SLOT_MINUTES) {
      const deadlineStart = setMinutesOnDate(day, slot)
      const deadlineEnd = setMinutesOnDate(day, slot + DELIVERY_SLOT_MINUTES)
      if (deadlineEnd.getTime() <= nowMs) continue
      options.push({
        key: deadlineEnd.toISOString(),
        type: DELIVERY_TIME_TYPE.SLOT,
        label: formatSlotLabel(deadlineStart, deadlineEnd, now),
        deadlineStart,
        deadlineEnd,
      })
    }
  }

  return options
}

export function formatDeliveryTimeLabel(order, now = new Date()) {
  if (!order?.deliveryDeadlineEnd) return ''
  const end = new Date(order.deliveryDeadlineEnd)
  const endPrefix = formatSlotDatePrefix(end, now)
  if (order.deliveryTimeType === DELIVERY_TIME_TYPE.ASAP) {
    return `${endPrefix}${formatHm(end)}之前`
  }
  const start = order.deliveryDeadlineStart ? new Date(order.deliveryDeadlineStart) : null
  if (start) {
    const prefix = formatSlotDatePrefix(start, now)
    return `${prefix}${formatHm(start)}-${formatHm(end)}`
  }
  return `${endPrefix}${formatHm(end)}之前`
}

/** 实际送达：仅已完成订单取 completedAt，其余显示 -- */
export function formatActualDeliveryLabel(order, now = new Date()) {
  if (order?.status !== 'completed' || !order.completedAt) return '--'
  const d = new Date(order.completedAt)
  if (Number.isNaN(d.getTime())) return '--'
  const prefix = formatSlotDatePrefix(d, now)
  const gap = prefix ? ' ' : ''
  return `${prefix}${gap}${formatHm(d)}`
}

/** 无时限字段的旧单：一律按发布时间 + 30 分钟（不随查看时刻滑动） */
export function resolveLegacyDeliveryDeadlines(order, now = new Date()) {
  const created = new Date(order.createdAt || now)
  return {
    deliveryTimeType: DELIVERY_TIME_TYPE.ASAP,
    deliveryDeadlineStart: created,
    deliveryDeadlineEnd: new Date(created.getTime() + DELIVERY_ASAP_OFFSET_MIN * 60000),
  }
}

export function legacyAsapDeadlineEnd(createdAt, now = new Date()) {
  const created = new Date(createdAt || now)
  return new Date(created.getTime() + DELIVERY_ASAP_OFFSET_MIN * 60000)
}

/** 旧单（无 deliveryDeadlineEnd）是否仍在可接窗口内 */
export function isLegacyOpenOrderActive(order, now = new Date()) {
  if (order.deliveryDeadlineEnd && order.deliveryTimeType) return null
  return legacyAsapDeadlineEnd(order.createdAt, now).getTime() > now.getTime()
}

/** 接单大厅：未过期 open 单的 MongoDB 条件 */
export function buildOpenHallDeadlineFilter(now = new Date()) {
  const legacyOpenCutoff = new Date(now.getTime() - DELIVERY_ASAP_OFFSET_MIN * 60000)
  return {
    $or: [
      { deliveryDeadlineEnd: { $gt: now } },
      {
        $and: [
          { $or: [{ deliveryDeadlineEnd: null }, { deliveryTimeType: null }] },
          { createdAt: { $gt: legacyOpenCutoff } },
        ],
      },
    ],
  }
}

export function isSystemAcceptExpiredOrder(order) {
  return order?.status === 'cancelled' && order?.cancelReason === DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED
}

/** 超时未接单、已被系统取消的订单 */
export function buildAcceptExpiredFilter() {
  return {
    status: 'cancelled',
    cancelReason: DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED,
  }
}

/** 发布人主动取消的订单（不含系统逾期取消） */
export function buildUserCancelledFilter() {
  return {
    status: 'cancelled',
    cancelReason: { $ne: DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED },
  }
}

export function isUserCancelledOrder(order) {
  return order?.status === 'cancelled' && !isSystemAcceptExpiredOrder(order)
}

export function deliveryOrderDisplayStatus(order) {
  if (isSystemAcceptExpiredOrder(order)) return 'acceptExpired'
  return order?.status || ''
}

/** 仍为 open 且已超过预计送达时间的订单（待系统自动取消） */
export function buildOpenAcceptExpiredFilter(now = new Date()) {
  const legacyOpenCutoff = new Date(now.getTime() - DELIVERY_ASAP_OFFSET_MIN * 60000)
  return {
    status: 'open',
    $or: [
      { deliveryDeadlineEnd: { $lt: now, $ne: null } },
      {
        $and: [
          { $or: [{ deliveryDeadlineEnd: null }, { deliveryTimeType: null }] },
          { createdAt: { $lte: legacyOpenCutoff } },
        ],
      },
    ],
  }
}

export function normalizeDeliveryDeadlines(order, now = new Date()) {
  if (order.deliveryDeadlineEnd && order.deliveryTimeType) {
    return {
      deliveryTimeType: order.deliveryTimeType,
      deliveryDeadlineStart: new Date(order.deliveryDeadlineStart || order.createdAt || now),
      deliveryDeadlineEnd: new Date(order.deliveryDeadlineEnd),
    }
  }
  return resolveLegacyDeliveryDeadlines(order, now)
}

export function isAcceptExpired(order, now = new Date()) {
  const { deliveryDeadlineEnd } = normalizeDeliveryDeadlines(order, now)
  return order.status === 'open' && now > deliveryDeadlineEnd
}

export function isDeliveryOverdue(order, now = new Date()) {
  const { deliveryDeadlineEnd } = normalizeDeliveryDeadlines(order, now)
  return ['accepted', 'delivering'].includes(order.status) && now > deliveryDeadlineEnd
}

export function validateDeliveryTimePayload(payload, now = new Date()) {
  const { deliveryTimeType, deliveryDeadlineStart, deliveryDeadlineEnd } = payload
  if (!deliveryTimeType || !deliveryDeadlineStart || !deliveryDeadlineEnd) {
    const err = new Error('请选择预计送达时间')
    err.code = 40000
    throw err
  }
  const start = new Date(deliveryDeadlineStart)
  const end = new Date(deliveryDeadlineEnd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    const err = new Error('预计送达时间无效')
    err.code = 40000
    throw err
  }

  const options = buildDeliveryTimeOptions(now)
  const matched = options.some((opt) => {
    if (opt.type !== deliveryTimeType) return false
    const tolerance = deliveryTimeType === DELIVERY_TIME_TYPE.ASAP ? 120000 : 60000
    return (
      Math.abs(opt.deadlineStart.getTime() - start.getTime()) <= tolerance &&
      Math.abs(opt.deadlineEnd.getTime() - end.getTime()) <= tolerance
    )
  })
  if (!matched) {
    const err = new Error('所选送达时间已过期或不在可选范围内，请重新选择')
    err.code = 40000
    throw err
  }
  return { deliveryTimeType, deliveryDeadlineStart: start, deliveryDeadlineEnd: end }
}

/** 接单大厅时段筛选：仅半小时间隔，不含「尽快送达」（ASAP 单归入截止落在该时段内的订单） */
export function buildHallDeliveryTimeFilterOptions(now = new Date()) {
  const slots = buildDeliveryTimeOptions(now).filter((o) => o.type === DELIVERY_TIME_TYPE.SLOT)
  return [{ key: '', label: '全部时段', deadlineStart: null, deadlineEnd: null }, ...slots]
}

export function findHallTimeSlotOption(start, end, now = new Date()) {
  if (!start || !end) return null
  const slotStart = new Date(start)
  const slotEnd = new Date(end)
  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime())) return null
  return buildHallDeliveryTimeFilterOptions(now).find((opt) => {
    if (!opt.deadlineStart || !opt.deadlineEnd) return false
    return (
      Math.abs(opt.deadlineStart.getTime() - slotStart.getTime()) <= 60000 &&
      Math.abs(opt.deadlineEnd.getTime() - slotEnd.getTime()) <= 60000
    )
  })
}

/** 构建 MongoDB 条件：订单截止时刻落在该半小时间隔内（含 ASAP / 无字段旧单） */
export function buildDeliverySlotMatchCondition(slotStart, slotEnd) {
  const start = new Date(slotStart)
  const end = new Date(slotEnd)
  const legacyCreatedStart = new Date(start.getTime() - DELIVERY_ASAP_OFFSET_MIN * 60000)
  const legacyCreatedEnd = new Date(end.getTime() - DELIVERY_ASAP_OFFSET_MIN * 60000)
  return {
    $or: [
      { deliveryDeadlineEnd: { $gt: start, $lte: end } },
      {
        $and: [
          { $or: [{ deliveryDeadlineEnd: null }, { deliveryTimeType: null }] },
          { createdAt: { $gt: legacyCreatedStart, $lte: legacyCreatedEnd } },
        ],
      },
    ],
  }
}

export function sortOrdersByDeadline(orders, now = new Date()) {
  return [...orders].sort((a, b) => {
    const aEnd = normalizeDeliveryDeadlines(a, now).deliveryDeadlineEnd.getTime()
    const bEnd = normalizeDeliveryDeadlines(b, now).deliveryDeadlineEnd.getTime()
    if (aEnd !== bEnd) return aEnd - bEnd
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })
}
