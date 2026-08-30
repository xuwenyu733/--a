import { request } from '@/utils/request'

export const listResumeHistory = (params) => request({ url: '/resume/history', data: params })
export const getResumeHistory = (id) => request({ url: `/resume/history/${id}` })
export const createResumeHistory = (data) => request({ url: '/resume/history', method: 'POST', data })
export const updateResumeHistory = (id, data) => request({ url: `/resume/history/${id}`, method: 'PUT', data })
export const deleteResumeHistory = (id) => request({ url: `/resume/history/${id}`, method: 'DELETE' })
export const generateResume = (data) => request({ url: '/resume/generate', method: 'POST', data })
