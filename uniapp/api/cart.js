import { request } from '@/utils/request'

export const getCart = (params) => request({ url: '/cart', data: params })
export const getCartCount = () => request({ url: '/cart/count' })
export const addToCart = (data) => request({ url: '/cart', method: 'POST', data })
export const updateCartItem = (id, data) => request({ url: `/cart/${id}`, method: 'PATCH', data })
export const removeCartItem = (id) => request({ url: `/cart/${id}`, method: 'DELETE' })
export const clearCart = () => request({ url: '/cart', method: 'DELETE' })
export const checkoutCart = (data) => request({ url: '/cart/checkout', method: 'POST', data })
