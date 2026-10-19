import request from '@/utils/request'

export const getAddresses = () => request.get('/addresses')
export const createAddress = (data) => request.post('/addresses', data)
export const updateAddress = (id, data) => request.put(`/addresses/${id}`, data)
export const deleteAddress = (id) => request.delete(`/addresses/${id}`)
export const setDefaultAddress = (id) => request.patch(`/addresses/${id}/default`)
