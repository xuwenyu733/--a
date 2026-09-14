import type { ORDER_STATUS } from '../constants/order.js'

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean

export function validateOrderStatusUpdate(params: {
  currentStatus: OrderStatus
  nextStatus: OrderStatus
  isBuyer: boolean
  isSeller: boolean
}): { ok: true } | { ok: false; message: string; code: number }

export function validateCreateOrder(params: {
  buyer: { role: string; studentVerified?: boolean; _id: string }
  product: { status: string; sellerId: string; stock?: number } | null
  hasActiveOrder: boolean
  quantity?: number
}): { ok: true } | { ok: false; message: string; code: number }

export function validateMarkBuyerPaid(params: {
  orderStatus: OrderStatus
  paymentStatus: string
  buyerId: string
  userId: string
}): { ok: true } | { ok: false; message: string; code: number }

export function validateConfirmSellerPayment(params: {
  orderStatus: OrderStatus
  paymentStatus: string
  sellerId: string
  userId: string
}): { ok: true } | { ok: false; message: string; code: number }

export function validateHideOrder(params: {
  orderStatus: OrderStatus
  buyerId: string
  sellerId: string
  userId: string
}): { ok: true } | { ok: false; message: string; code: number }
