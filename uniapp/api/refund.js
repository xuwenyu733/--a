import { request } from '@/utils/request'

export const list = (params) => request({ url: '/refunds', data: params })
export const getByOrder = (orderId) => request({ url: `/orders/${orderId}/refund` })
export const create = (orderId, data) =>
  request({ url: `/orders/${orderId}/refund`, method: 'POST', data })
export const respond = (orderId, data) =>
  request({ url: `/orders/${orderId}/refund/respond`, method: 'PATCH', data })
export const cancel = (orderId) =>
  request({ url: `/orders/${orderId}/refund`, method: 'DELETE' })
