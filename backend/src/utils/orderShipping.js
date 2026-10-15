import { listAddresses } from '../services/addressService.js'

/**
 * 支付前绑定买家收货地址到订单快照。
 * @param {import('mongoose').Document} order
 * @param {string} buyerId
 * @param {string} [addressId]
 */
export async function bindShippingAddressBeforePay(order, buyerId, addressId) {
  const { list } = await listAddresses(buyerId)
  if (!list.length) {
    const err = new Error('请先添加收货地址后再支付')
    err.code = 40000
    throw err
  }

  let addr = null
  if (addressId) {
    addr = list.find((a) => String(a._id) === String(addressId))
    if (!addr) {
      const err = new Error('收货地址无效或不属于当前用户')
      err.code = 40000
      throw err
    }
  } else if (order.shippingAddress?.detail && order.shippingAddress?.phone) {
    return order
  } else {
    addr = list.find((a) => a.isDefault) || list[0]
  }

  order.shippingAddress = {
    addressId: addr._id,
    name: addr.name,
    phone: addr.phone,
    region: addr.region || '',
    detail: addr.detail,
  }
  await order.save()
  return order
}

export function hasShippingAddress(order) {
  const s = order?.shippingAddress
  return !!(s && s.phone && s.detail)
}
