import request from '@/utils/request'

export const sendCode = (phone) => request.post('/auth/send-code', { phone })
export const register = (data) => request.post('/auth/register', data)
export const login = (data) => request.post('/auth/login', data)
export const logout = () => request.post('/auth/logout')
export const getMe = () => request.get('/auth/me')
export const changePassword = (data) => request.post('/auth/change-password', data)
export const getRegions = () => request.get('/regions')

/** 使用原生 axios，避免与 request 拦截器循环；必须带 Cookie（httpOnly refresh） */
export async function refreshToken(refreshToken) {
  const axios = (await import('axios')).default
  const base = import.meta.env.VITE_API_BASE || '/api'
  const { data } = await axios.post(
    `${base}/auth/refresh-token`,
    refreshToken ? { refreshToken } : {},
    { withCredentials: true }
  )
  if (data.code !== 0) throw new Error(data.message || '登录已失效')
  return data.data
}
