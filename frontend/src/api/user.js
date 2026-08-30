import request from '@/utils/request'

export const updateProfile = (data) => request.put('/users/profile', data)
export const getVerifyStatus = () => request.get('/users/verify/status')
export const submitStudentVerify = (data) => request.post('/users/verify/student', data)
export const submitMerchantVerify = (data) => request.post('/users/verify/merchant', data)
export const submitCourierVerify = (data) => request.post('/users/verify/courier', data)
export const getPublicUser = (id) => request.get(`/users/${id}`)
export const getSearchHistory = () => request.get('/users/search-history')
export const saveSearchHistory = (keyword) => request.post('/users/search-history', { keyword })
export const clearSearchHistory = () => request.delete('/users/search-history')
