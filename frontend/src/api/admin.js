import request from '@/utils/request'

export const getAdminDashboard = () => request.get('/admin/dashboard')
export const getRegions = () => request.get('/admin/regions')
export const createRegion = (data) => request.post('/admin/regions', data)
export const assignAgent = (regionId, agentId) =>
  request.patch(`/admin/regions/${regionId}/agent`, { agentId })
export const getAgents = () => request.get('/admin/agents')
export const createAgent = (data) => request.post('/admin/agents', data)
export const getAdminUsers = (params) => request.get('/admin/users', { params })
export const getAdminVerifications = (params) => request.get('/admin/verifications', { params })
export const adminReviewVerification = (id, data) =>
  request.patch(`/admin/verifications/${id}`, data)
export const getAdminOrders = (params) => request.get('/admin/orders', { params })
export const restoreAdminOrder = (id) => request.post(`/admin/orders/${id}/restore`)
export const getAdminProducts = (params) => request.get('/admin/products', { params })
export const adminModerateProduct = (id, status) =>
  request.patch(`/admin/products/${id}/status`, { status })

export const getAdminDeliveryOrders = (params) =>
  request.get('/admin/delivery-orders', { params })
