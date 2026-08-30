import { request } from '@/utils/request'

export const create = (data) => request({ url: '/orders', method: 'POST', data })
export const list = (params) => request({ url: '/orders', data: params })
export const updateStatus = (id, data) => request({ url: `/orders/${id}/status`, method: 'PATCH', data })
export const markPaid = (id) => request({ url: `/orders/${id}/mark-paid`, method: 'POST' })
export const confirmPayment = (id) => request({ url: `/orders/${id}/confirm-payment`, method: 'POST' })
export const hideOrder = (id) => request({ url: `/orders/${id}`, method: 'DELETE' })
