import { request } from '@/utils/request'

export const getPublicShop = (userId, params) => request({ url: `/merchant/shop/${userId}`, data: params })
export const getMyShop = () => request({ url: '/merchant/shop' })
export const updateMyShop = (data) => request({ url: '/merchant/shop', method: 'PUT', data })
