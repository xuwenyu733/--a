import { request } from '@/utils/request'

export const getProducts = (params) => request({ url: '/products', data: params })
export const getRecommended = (params) => request({ url: '/products/recommended', data: params })
export const getDetail = (id) => request({ url: `/products/${id}` })
export const getMine = (params) => request({ url: '/products/mine', data: params })
export const create = (data) => request({ url: '/products', method: 'POST', data })
export const update = (id, data) => request({ url: `/products/${id}`, method: 'PUT', data })
export const updateStatus = (id, status) => request({ url: `/products/${id}/status`, method: 'PATCH', data: { status } })
export const toggleFavorite = (id) => request({ url: `/products/${id}/favorite`, method: 'POST' })
export const getFavorites = (params) => request({ url: '/products/favorites', data: params })
export const contactSeller = (productId) => request({ url: '/chat/contact-seller', method: 'POST', data: { productId } })
