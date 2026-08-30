export function validateCourierVerified(
  courierVerified: boolean
): { ok: true } | { ok: false; message: string; code: number }

export function validateCreateDeliveryOrder(params: {
  regionId: unknown
}): { ok: true } | { ok: false; message: string; code: number }

export function canTransitionDeliveryStatus(current: string, next: string): boolean

export function validateDeliveryCancel(params: {
  orderStatus: string
  isPoster: boolean
  isCourier: boolean
}): { ok: true } | { ok: false; message: string; code: number }

export function validateDeliveryProgress(params: {
  orderStatus: string
  nextStatus: string
  isCourier: boolean
}): { ok: true } | { ok: false; message: string; code: number }

export function buildCourierZoneFilter(params: {
  allowedZoneIds?: unknown[]
  requestedZoneId?: string
}): { empty?: boolean; zoneId?: string | { $in: unknown[] } }

export function canViewDeliveryOrder(params: {
  userId: unknown
  courierVerified: boolean
  userRegionId: unknown
  posterId: unknown
  courierId: unknown
  orderStatus: string
  orderRegionId: unknown
}): boolean
