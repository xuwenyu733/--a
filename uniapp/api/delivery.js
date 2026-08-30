import { request } from '@/utils/request'

export const getDeliveryZones = (regionId) => request({ url: '/delivery/zones', data: { regionId } })
export const createDeliveryOrder = (data) => request({ url: '/delivery/orders', method: 'POST', data })
export const getMyDeliveryOrders = (params) => request({ url: '/delivery/orders', data: params })
export const getOpenDeliveryOrders = (params) => request({ url: '/delivery/orders/open', data: params })
export const acceptDeliveryOrder = (id) => request({ url: `/delivery/orders/${id}/accept`, method: 'PATCH' })
export const updateDeliveryOrderStatus = (id, data) =>
  request({ url: `/delivery/orders/${id}/status`, method: 'PATCH', data })
