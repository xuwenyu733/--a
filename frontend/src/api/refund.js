import request from '@/utils/request'

export const listRefunds = (params) => request.get('/refunds', { params })
export const createRefund = (orderId, data) => request.post(`/orders/${orderId}/refund`, data)
export const respondRefund = (orderId, data) => request.patch(`/orders/${orderId}/refund/respond`, data)
export const cancelRefund = (orderId) => request.delete(`/orders/${orderId}/refund`)
