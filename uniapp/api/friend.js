import { request } from '@/utils/request'

export const searchFriends = (params) =>
  request({ url: '/friends/search', data: params })

export const getMyFriendCode = () => request({ url: '/friends/me/code' })

export const listFriends = (params) => request({ url: '/friends', data: params })

export const listFriendRequests = () => request({ url: '/friends/requests' })

export const sendFriendRequest = (data) =>
  request({ url: '/friends/requests', method: 'POST', data })

export const acceptFriendRequest = (id) =>
  request({ url: `/friends/requests/${id}/accept`, method: 'POST' })

export const rejectFriendRequest = (id) =>
  request({ url: `/friends/requests/${id}/reject`, method: 'POST' })

export const removeFriend = (userId) =>
  request({ url: `/friends/${userId}`, method: 'DELETE' })
