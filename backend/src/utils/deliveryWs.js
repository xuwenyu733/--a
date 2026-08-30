import User from '../models/User.js'
import { WS_EVENTS } from '../constants/wsEvents.js'
import { connectionManager } from '../websocket/connectionManager.js'

function deliveryWsPayload(order) {
  return {
    orderId: order._id.toString(),
    status: order.status,
  }
}

/** 新跑腿单：通知同校区认证骑手 */
export async function pushDeliveryNew(order) {
  const couriers = await User.find({
    regionId: order.regionId,
    courierVerified: true,
  })
    .select('_id')
    .lean()
  const payload = deliveryWsPayload(order)
  for (const courier of couriers) {
    connectionManager.sendToUser(courier._id.toString(), WS_EVENTS.DELIVERY_NEW, payload)
  }
}

/** 跑腿单状态变更：通知发布人与骑手 */
export function pushDeliveryUpdate(order) {
  const payload = deliveryWsPayload(order)
  connectionManager.sendToUser(order.posterId.toString(), WS_EVENTS.DELIVERY_UPDATE, payload)
  if (order.courierId) {
    connectionManager.sendToUser(order.courierId.toString(), WS_EVENTS.DELIVERY_UPDATE, payload)
  }
}
