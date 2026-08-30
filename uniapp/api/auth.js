import { request } from '@/utils/request'

export const sendCode = (phone) => request({ url: '/auth/send-code', method: 'POST', data: { phone } })
export const register = (data) => request({ url: '/auth/register', method: 'POST', data })
export const login = (data) => request({ url: '/auth/login', method: 'POST', data })
export const logout = () => request({ url: '/auth/logout', method: 'POST' })
export const getMe = () => request({ url: '/auth/me' })
export const getRegions = () => request({ url: '/regions' })
export const wechatLogin = (data) => request({ url: '/auth/wechat-login', method: 'POST', data })
