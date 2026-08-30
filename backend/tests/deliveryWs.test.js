import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/websocket/connectionManager.js', () => ({
  connectionManager: {
    sendToUser: vi.fn(),
  },
}))

vi.mock('../src/models/User.js', () => ({
  default: {
    find: vi.fn(),
  },
}))

import User from '../src/models/User.js'
import { connectionManager } from '../src/websocket/connectionManager.js'
import { WS_EVENTS } from '../src/constants/wsEvents.js'
import { pushDeliveryNew, pushDeliveryUpdate } from '../src/utils/deliveryWs.js'

describe('deliveryWs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pushDeliveryNew notifies couriers in region', async () => {
    User.find.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: 'c1' }, { _id: 'c2' }]),
      }),
    })
    const order = { _id: { toString: () => 'o1' }, regionId: 'r1', status: 'open' }

    await pushDeliveryNew(order)

    expect(User.find).toHaveBeenCalledWith({ regionId: 'r1', courierVerified: true })
    expect(connectionManager.sendToUser).toHaveBeenCalledTimes(2)
    expect(connectionManager.sendToUser).toHaveBeenCalledWith('c1', WS_EVENTS.DELIVERY_NEW, {
      orderId: 'o1',
      status: 'open',
    })
  })

  it('pushDeliveryUpdate notifies poster and courier', () => {
    const order = {
      _id: { toString: () => 'o1' },
      posterId: { toString: () => 'p1' },
      courierId: { toString: () => 'c1' },
      status: 'accepted',
    }

    pushDeliveryUpdate(order)

    expect(connectionManager.sendToUser).toHaveBeenCalledWith('p1', WS_EVENTS.DELIVERY_UPDATE, {
      orderId: 'o1',
      status: 'accepted',
    })
    expect(connectionManager.sendToUser).toHaveBeenCalledWith('c1', WS_EVENTS.DELIVERY_UPDATE, {
      orderId: 'o1',
      status: 'accepted',
    })
  })

  it('pushDeliveryUpdate skips courier when absent', () => {
    const order = {
      _id: { toString: () => 'o1' },
      posterId: 'p1',
      courierId: null,
      status: 'open',
    }

    pushDeliveryUpdate(order)

    expect(connectionManager.sendToUser).toHaveBeenCalledTimes(1)
  })
})
