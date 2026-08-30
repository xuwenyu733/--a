import { request } from '@/utils/request'

export const updateProfile = (data) => request({ url: '/users/profile', method: 'PUT', data })
export const getVerifyStatus = () => request({ url: '/users/verify/status' })
export const submitStudentVerify = (data) => request({ url: '/users/verify/student', method: 'POST', data })
export const submitMerchantVerify = (data) => request({ url: '/users/verify/merchant', method: 'POST', data })
export const submitCourierVerify = (data) => request({ url: '/users/verify/courier', method: 'POST', data })
export const getPublicUser = (id) => request({ url: `/users/${id}` })
