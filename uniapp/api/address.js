import { request } from '@/utils/request'

export const getAddresses = () => request({ url: '/addresses' })
export const createAddress = (data) => request({ url: '/addresses', method: 'POST', data })
export const updateAddress = (id, data) => request({ url: `/addresses/${id}`, method: 'PUT', data })
export const deleteAddress = (id) => request({ url: `/addresses/${id}`, method: 'DELETE' })
export const setDefaultAddress = (id) => request({ url: `/addresses/${id}/default`, method: 'PATCH' })
