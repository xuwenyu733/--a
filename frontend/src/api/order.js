import request from '@/utils/request'

export const createOrder = (data) => request.post('/orders', data)
export const getOrders = (params) => request.get('/orders', { params })
export const getOrderDetail = (id) => request.get(`/orders/${id}`)
export const updateOrderStatus = (id, data) => request.patch(`/orders/${id}/status`, data)
export const hideOrder = (id) => request.delete(`/orders/${id}`)
export const markOrderPaid = (id) => request.post(`/orders/${id}/mark-paid`)
export const confirmOrderPayment = (id) => request.post(`/orders/${id}/confirm-payment`)
