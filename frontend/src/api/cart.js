import request from '@/utils/request'

export const getCart = (params) => request.get('/cart', { params })
export const getCartCount = () => request.get('/cart/count')
export const addToCart = (data) => request.post('/cart', data)
export const updateCartItem = (id, data) => request.patch(`/cart/${id}`, data)
export const removeCartItem = (id) => request.delete(`/cart/${id}`)
export const clearCart = () => request.delete('/cart')
export const checkoutCart = (data) => request.post('/cart/checkout', data)
