import request from '@/utils/request'

export const getConversations = () => request.get('/chat/conversations')
export const getConversation = (id) => request.get(`/chat/conversations/${id}`)
export const createConversation = (data) => request.post('/chat/conversations', data)
export const contactSeller = (productId) => request.post('/chat/contact-seller', { productId })
export const getMessages = (conversationId, params) =>
  request.get(`/chat/conversations/${conversationId}/messages`, { params })
export const sendMessage = (conversationId, data) =>
  request.post(`/chat/conversations/${conversationId}/messages`, data)
export const markRead = (conversationId) => request.patch(`/chat/conversations/${conversationId}/read`)
