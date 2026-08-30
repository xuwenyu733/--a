import request from '@/utils/request'

export const getOrderReviewSummary = (orderId) => request.get(`/reviews/orders/${orderId}`)

export const submitOrderReview = (orderId, data) =>
  request.post(`/reviews/orders/${orderId}`, data)

export const getUserReviews = (userId, params) =>
  request.get(`/reviews/users/${userId}`, { params })
