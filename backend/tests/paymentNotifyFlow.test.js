import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = {
  tx: null,
  order: null,
  claimed: 0,
  reconcile: 0,
  notifies: 0,
}

vi.mock('../src/models/PaymentTransaction.js', () => ({
  default: {
    findOne: vi.fn(async (query) => {
      if (!state.tx) return null
      if (query?.paymentNo && query.paymentNo !== state.tx.paymentNo) return null
      if (query?.channel && query.channel !== state.tx.channel) return null
      return state.tx
    }),
    findOneAndUpdate: vi.fn(async (query, update) => {
      if (!state.tx || state.tx.paymentNo !== query.paymentNo) return null
      const allowed = query.status?.$in || []
      if (!allowed.includes(state.tx.status)) return null
      state.tx = { ...state.tx, ...update.$set }
      state.claimed += 1
      return state.tx
    }),
    updateOne: vi.fn(async (_query, update) => {
      if (update?.$set?.reconciliationStatus === 'needs_review') state.reconcile += 1
      if (state.tx && update?.$set) Object.assign(state.tx, update.$set)
      return {}
    }),
    updateMany: vi.fn(async () => ({})),
    find: vi.fn(() => ({ sort() { return this }, limit: async () => [] })),
    create: vi.fn(),
  },
}))

function orderQuery() {
  const pending = Promise.resolve(state.order)
  pending.populate = () => Promise.resolve(state.order)
  return pending
}

vi.mock('../src/models/Order.js', () => ({
  default: {
    findOne: vi.fn(() => orderQuery()),
    findById: vi.fn(() => orderQuery()),
  },
}))

vi.mock('../src/models/User.js', () => ({
  default: {
    find: vi.fn(() => ({
      select: () => ({ lean: async () => [{ _id: 'admin1' }] }),
    })),
    findById: vi.fn(),
  },
}))

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn(async () => {
    state.notifies += 1
  }),
}))

const { processVerifiedPaymentNotify } = await import('../src/services/paymentService.js')

function baseTx(overrides = {}) {
  return {
    _id: 'tx1',
    paymentNo: 'PAYTEST1',
    channel: 'wechat',
    status: 'pending',
    amount: 50,
    orderId: 'order1',
    buyerId: 'buyer',
    sellerId: 'seller',
    shippingUploadAttempts: 0,
    ...overrides,
  }
}

describe('processVerifiedPaymentNotify', () => {
  beforeEach(() => {
    state.claimed = 0
    state.reconcile = 0
    state.notifies = 0
    state.order = {
      _id: 'order1',
      status: 'confirmed',
      paymentStatus: 'pending_online',
      shippingAddress: { name: '张三', phone: '13800138000', detail: '1号楼101' },
      buyerId: 'buyer',
      sellerId: 'seller',
      save: vi.fn(async () => {}),
      productId: { title: '台灯' },
    }
    state.tx = baseTx()
  })

  it('does not credit when total_fee differs from tx.amount', async () => {
    const res = await processVerifiedPaymentNotify({
      channel: 'wechat',
      paymentNo: 'PAYTEST1',
      transactionId: 'WX1',
      totalFeeFen: 1,
      notifyRaw: '<xml/>',
    })
    expect(res.credited).toBe(false)
    expect(res.message).toBe('amount_mismatch')
    expect(state.claimed).toBe(0)
    expect(state.reconcile).toBe(1)
    expect(state.order.save).not.toHaveBeenCalled()
  })

  it('credits an expired payment when the order is still payable', async () => {
    state.tx = baseTx({ status: 'expired' })
    const res = await processVerifiedPaymentNotify({
      channel: 'wechat',
      paymentNo: 'PAYTEST1',
      transactionId: 'WX2',
      totalFeeFen: 5000,
      notifyRaw: '<xml/>',
    })
    expect(res.credited).toBe(true)
    expect(state.tx.status).toBe('paid')
    expect(state.order.paymentStatus).toBe('paid_online')
    expect(state.notifies).toBe(2)
  })

  it('flags an expired callback instead of dropping it when the order is cancelled', async () => {
    state.tx = baseTx({ status: 'expired' })
    state.order = { ...state.order, status: 'cancelled', save: vi.fn() }
    const res = await processVerifiedPaymentNotify({
      channel: 'wechat',
      paymentNo: 'PAYTEST1',
      transactionId: 'WX3',
      totalFeeFen: 5000,
    })
    expect(res.credited).toBe(false)
    expect(res.message).toBe('expired_not_payable')
    expect(state.claimed).toBe(0)
    expect(state.reconcile).toBe(1)
    expect(state.notifies).toBeGreaterThanOrEqual(1)
  })

  it('applies side effects only once when two callbacks race', async () => {
    const payload = {
      channel: 'wechat',
      paymentNo: 'PAYTEST1',
      transactionId: 'WX4',
      totalFeeFen: 5000,
    }
    const [a, b] = await Promise.all([
      processVerifiedPaymentNotify(payload),
      processVerifiedPaymentNotify(payload),
    ])
    const credited = [a, b].filter((r) => r.credited).length
    expect(credited).toBe(1)
    expect(state.claimed).toBe(1)
    expect(state.notifies).toBe(2)
  })
})
