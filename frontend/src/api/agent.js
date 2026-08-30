import request from '@/utils/request'

export const getAgentDashboard = () => request.get('/agent/dashboard')
export const getAgentVerifications = (params) => request.get('/agent/verifications', { params })
export const reviewVerification = (id, data) => request.patch(`/agent/verifications/${id}`, data)

export const getAgentDeliveryZones = (params) =>
  request.get('/agent/delivery-zones', { params })
export const createAgentDeliveryZone = (data) =>
  request.post('/agent/delivery-zones', data)
export const updateAgentDeliveryZone = (id, data) =>
  request.put(`/agent/delivery-zones/${id}`, data)
export const deleteAgentDeliveryZone = (id) =>
  request.delete(`/agent/delivery-zones/${id}`)
export const seedAgentDeliveryZones = () =>
  request.post('/agent/delivery-zones/seed')

export const getAgentDeliveryOrders = (params) =>
  request.get('/agent/delivery-orders', { params })
export const getAgentUsers = (params) => request.get('/agent/users', { params })
export const updateUserStatus = (id, data) => request.patch(`/agent/users/${id}/status`, data)
