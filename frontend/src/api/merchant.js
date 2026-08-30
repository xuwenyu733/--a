import request from '@/utils/request'

export const getMerchantStats = () => request.get('/merchant/stats')
export const getPublicShop = (userId, params) => request.get(`/merchant/shop/${userId}`, { params })
export const getMyShop = () => request.get('/merchant/shop')
export const updateMyShop = (data) => request.put('/merchant/shop', data)
