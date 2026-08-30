import { request } from '@/utils/request'

export const getOrderReviewSummary = (orderId) => request({ url: `/reviews/orders/${orderId}` })
export const submitOrderReview = (orderId, data) =>
  request({ url: `/reviews/orders/${orderId}`, method: 'POST', data })
