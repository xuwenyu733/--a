import { request } from '@/utils/request'

export const getNotifications = (params) => request({ url: '/notifications', data: params })
export const markAllNotificationsRead = () => request({ url: '/notifications/read-all', method: 'PATCH' })
export const markNotificationRead = (id) => request({ url: `/notifications/${id}/read`, method: 'PATCH' })
