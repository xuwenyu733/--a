export function validateCreateOnlinePayment(params: {
  paymentEnabled: boolean
  channel: string
  orderStatus: string
  paymentStatus: string
  buyerId: string
  userId: string
}): { ok: true } | { ok: false; message: string; code: number }

export function validateSimulateSandboxPayment(params: {
  mode: string
  buyerId: string
  userId: string
  txStatus: string
  expiredAt?: Date | string
}): { ok: true } | { ok: false; message: string; code: number }

export function validatePaymentParticipant(params: {
  buyerId: string
  sellerId: string
  userId: string
}): { ok: true } | { ok: false; message: string; code: number }

export function formatPaymentResponse(
  tx: Record<string, unknown>,
  order: Record<string, unknown> | null,
  options?: { sandbox?: boolean }
): Record<string, unknown>
