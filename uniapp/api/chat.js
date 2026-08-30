import { request } from '@/utils/request'

export const getConversations = () => request({ url: '/chat/conversations' })
export const getConversation = (id) => request({ url: `/chat/conversations/${id}` })
export const getMessages = (id, params) => request({ url: `/chat/conversations/${id}/messages`, data: params })
export const sendMessage = (id, data) => request({ url: `/chat/conversations/${id}/messages`, method: 'POST', data })
export const markRead = (id) => request({ url: `/chat/conversations/${id}/read`, method: 'PATCH' })
export const createConversation = (data) => request({ url: '/chat/conversations', method: 'POST', data })
