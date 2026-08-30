import request from '@/utils/request'

export const getDeliveryZones = (regionId) =>
  request.get('/delivery/zones', { params: { regionId } })

export const createDeliveryOrder = (data) => request.post('/delivery/orders', data)
export const getMyDeliveryOrders = (params) => request.get('/delivery/orders', { params })
export const getOpenDeliveryOrders = (params) => request.get('/delivery/orders/open', { params })
export const acceptDeliveryOrder = (id) => request.patch(`/delivery/orders/${id}/accept`)
export const updateDeliveryOrderStatus = (id, data) =>
  request.patch(`/delivery/orders/${id}/status`, data)
export const getDeliveryOrder = (id) => request.get(`/delivery/orders/${id}`)

export const getAdminDeliveryZones = (params) =>
  request.get('/admin/delivery-zones', { params })
export const createAdminDeliveryZone = (data) =>
  request.post('/admin/delivery-zones', data)
export const updateAdminDeliveryZone = (id, data) =>
  request.put(`/admin/delivery-zones/${id}`, data)
export const deleteAdminDeliveryZone = (id) =>
  request.delete(`/admin/delivery-zones/${id}`)
export const seedAdminDeliveryZones = (regionId) =>
  request.post('/admin/delivery-zones/seed', { regionId })
