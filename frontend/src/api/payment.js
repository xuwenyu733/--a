import request from '@/utils/request'

export const getPaymentConfig = () => request.get('/payments/config')
export const createOrderPayment = (orderId, data) =>
  request.post(`/orders/${orderId}/payments`, data)
export const getActiveOrderPayment = (orderId) =>
  request.get(`/orders/${orderId}/payments/active`)
export const getPaymentDetail = (paymentNo) => request.get(`/payments/${paymentNo}`)
export const simulatePayment = (paymentNo) =>
  request.post(`/payments/${paymentNo}/simulate`)
