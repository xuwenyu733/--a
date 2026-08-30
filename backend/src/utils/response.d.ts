import type { Response } from 'express'

export function success(res: Response, data?: unknown, message?: string): Response

export function fail(
  res: Response,
  code: number,
  message: string,
  status?: number
): Response

export const ErrorCodes: {
  readonly BAD_REQUEST: 40000
  readonly UNAUTHORIZED: 40100
  readonly TOKEN_EXPIRED: 40101
  readonly LOGIN_FAILED: 40102
  readonly FORBIDDEN: 40300
  readonly NO_PERMISSION: 40301
  readonly REGION_FORBIDDEN: 40302
  readonly NOT_FOUND: 40400
  readonly CONFLICT: 40900
  readonly SERVER_ERROR: 50000
}
