import request from '@/utils/request'

export const getReportReasons = () => request.get('/reports/reasons')
export const submitReport = (data) => request.post('/reports', data)
export const getReports = (params) => request.get('/reports', { params })
export const handleReport = (id, data) => request.patch(`/reports/${id}`, data)
