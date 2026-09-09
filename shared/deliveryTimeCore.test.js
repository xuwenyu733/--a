import { describe, it, expect } from 'vitest'
import {
  buildDeliveryTimeOptions,
  buildHallDeliveryTimeFilterOptions,
  buildDeliverySlotMatchCondition,
  formatDeliveryTimeLabel,
  formatActualDeliveryLabel,
  formatSlotDatePrefix,
  isAsapAvailable,
  isAcceptExpired,
  isDeliveryOverdue,
  isSystemAcceptExpiredOrder,
  buildAcceptExpiredFilter,
  buildUserCancelledFilter,
  isUserCancelledOrder,
  buildOpenAcceptExpiredFilter,
  resolveLegacyDeliveryDeadlines,
  validateDeliveryTimePayload,
  DELIVERY_TIME_TYPE,
  DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED,
} from './deliveryTimeCore.js'

describe('deliveryTimeCore', () => {
  it('offers asap when within service hours', () => {
    const now = new Date('2026-09-08T12:12:00')
    expect(isAsapAvailable(now)).toBe(true)
    const options = buildDeliveryTimeOptions(now)
    expect(options[0].type).toBe(DELIVERY_TIME_TYPE.ASAP)
    expect(options[0].label).toContain('12:42')
    expect(options.some((o) => o.label === '12:30-13:00')).toBe(true)
    expect(options.some((o) => o.label === '9月9日08:00-08:30')).toBe(true)
  })

  it('formats asap and slot labels with date prefix only for future days', () => {
    const now = new Date('2026-09-08T12:00:00')
    expect(
      formatDeliveryTimeLabel({
        deliveryTimeType: DELIVERY_TIME_TYPE.ASAP,
        deliveryDeadlineEnd: '2026-09-08T12:42:00',
      }, now)
    ).toBe('12:42之前')
    expect(
      formatDeliveryTimeLabel({
        deliveryTimeType: DELIVERY_TIME_TYPE.SLOT,
        deliveryDeadlineStart: '2026-09-08T12:30:00',
        deliveryDeadlineEnd: '2026-09-08T13:00:00',
      }, now)
    ).toBe('12:30-13:00')
    expect(
      formatDeliveryTimeLabel({
        deliveryTimeType: DELIVERY_TIME_TYPE.SLOT,
        deliveryDeadlineStart: '2026-09-09T08:00:00',
        deliveryDeadlineEnd: '2026-09-09T08:30:00',
      }, now)
    ).toBe('9月9日08:00-08:30')
    const nextDay = new Date('2026-09-09T10:00:00')
    expect(
      formatDeliveryTimeLabel({
        deliveryTimeType: DELIVERY_TIME_TYPE.SLOT,
        deliveryDeadlineStart: '2026-09-09T08:00:00',
        deliveryDeadlineEnd: '2026-09-09T08:30:00',
      }, nextDay)
    ).toBe('08:00-08:30')
    expect(formatSlotDatePrefix('2026-09-09T08:00:00', nextDay)).toBe('')
  })

  it('detects accept expired and delivery overdue', () => {
    const now = new Date('2026-09-08T13:05:00')
    const openOrder = {
      status: 'open',
      deliveryTimeType: DELIVERY_TIME_TYPE.SLOT,
      deliveryDeadlineStart: '2026-09-08T12:30:00',
      deliveryDeadlineEnd: '2026-09-08T13:00:00',
    }
    expect(isAcceptExpired(openOrder, now)).toBe(true)
    const activeOrder = { ...openOrder, status: 'delivering' }
    expect(isDeliveryOverdue(activeOrder, now)).toBe(true)
  })

  it('resolves legacy deadlines from createdAt + 30min', () => {
    const legacy = resolveLegacyDeliveryDeadlines(
      { status: 'open', createdAt: '2026-09-08T10:00:00' },
      new Date('2026-09-09T10:00:00')
    )
    expect(legacy.deliveryTimeType).toBe(DELIVERY_TIME_TYPE.ASAP)
    expect(new Date(legacy.deliveryDeadlineEnd).getHours()).toBe(10)
    expect(new Date(legacy.deliveryDeadlineEnd).getMinutes()).toBe(30)
    const openOrder = { status: 'open', createdAt: '2026-09-08T10:00:00' }
    expect(isAcceptExpired(openOrder, new Date('2026-09-09T10:00:00'))).toBe(true)
  })

  it('validates payload against current options', () => {
    const now = new Date('2026-09-08T12:12:00')
    const options = buildDeliveryTimeOptions(now)
    const asap = options.find((o) => o.type === DELIVERY_TIME_TYPE.ASAP)
    expect(() =>
      validateDeliveryTimePayload(
        {
          deliveryTimeType: asap.type,
          deliveryDeadlineStart: asap.deadlineStart.toISOString(),
          deliveryDeadlineEnd: asap.deadlineEnd.toISOString(),
        },
        now
      )
    ).not.toThrow()
  })

  it('formats actual delivery label for completed orders only', () => {
    const now = new Date('2026-09-08T15:00:00')
    expect(formatActualDeliveryLabel({ status: 'open' }, now)).toBe('--')
    expect(formatActualDeliveryLabel({ status: 'cancelled', completedAt: null }, now)).toBe('--')
    expect(
      formatActualDeliveryLabel({ status: 'completed', completedAt: '2026-09-08T14:25:00' }, now)
    ).toBe('14:25')
    expect(
      formatActualDeliveryLabel({ status: 'completed', completedAt: '2026-09-09T09:10:00' }, now)
    ).toBe('9月9日 09:10')
  })

  it('builds hall filter options without asap', () => {
    const now = new Date('2026-09-08T12:12:00')
    const hall = buildHallDeliveryTimeFilterOptions(now)
    expect(hall[0].label).toBe('全部时段')
    expect(hall.some((o) => o.type === DELIVERY_TIME_TYPE.ASAP)).toBe(false)
    expect(hall.some((o) => o.label === '12:30-13:00')).toBe(true)
  })

  it('identifies system-cancelled accept expired orders', () => {
    expect(
      isSystemAcceptExpiredOrder({
        status: 'cancelled',
        cancelReason: DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED,
      })
    ).toBe(true)
    expect(
      isSystemAcceptExpiredOrder({ status: 'cancelled', cancelReason: '用户取消' })
    ).toBe(false)
    expect(buildAcceptExpiredFilter()).toEqual({
      status: 'cancelled',
      cancelReason: DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED,
    })
    expect(buildUserCancelledFilter()).toEqual({
      status: 'cancelled',
      cancelReason: { $ne: DELIVERY_SYSTEM_CANCEL_ACCEPT_EXPIRED },
    })
    expect(
      isUserCancelledOrder({ status: 'cancelled', cancelReason: '不想送了' })
    ).toBe(true)
    const now = new Date('2026-09-08T13:05:00')
    expect(buildOpenAcceptExpiredFilter(now).status).toBe('open')
  })

  it('matches asap orders into next slot window', () => {
    const now = new Date('2026-09-08T12:12:00')
    const hall = buildHallDeliveryTimeFilterOptions(now)
    const slot = hall.find((o) => o.label === '12:30-13:00')
    const cond = buildDeliverySlotMatchCondition(slot.deadlineStart, slot.deadlineEnd)
    expect(cond.$or).toBeTruthy()
    expect(cond.$or.some((c) => c.deliveryDeadlineEnd?.$gt)).toBe(true)
    expect(cond.$or.some((c) => c.$and)).toBe(true)
  })
})
