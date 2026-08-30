import { request } from '@/utils/request'

export const getConfig = () => request({ url: '/payments/config' })
export const create = (orderId, data) => request({ url: `/orders/${orderId}/payments`, method: 'POST', data })
export const getActive = (orderId) => request({ url: `/orders/${orderId}/payments/active` })
export const simulate = (paymentNo) => request({ url: `/payments/${paymentNo}/simulate`, method: 'POST' })
