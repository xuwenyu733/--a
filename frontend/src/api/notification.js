import request from '@/utils/request'

export const getNotifications = (params) => request.get('/notifications', { params })
export const markAllNotificationsRead = () => request.patch('/notifications/read-all')
export const markNotificationRead = (id) => request.patch(`/notifications/${id}/read`)
