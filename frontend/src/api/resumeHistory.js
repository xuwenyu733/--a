import request from '@/utils/request'

export function listResumeHistory(params) {
  return request.get('/resume/history', { params })
}

export function getResumeHistory(id) {
  return request.get(`/resume/history/${id}`)
}

export function createResumeHistory(data) {
  return request.post('/resume/history', data)
}

export function updateResumeHistory(id, data) {
  return request.put(`/resume/history/${id}`, data)
}

export function deleteResumeHistory(id) {
  return request.delete(`/resume/history/${id}`)
}
