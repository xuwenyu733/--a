export const REFRESH_COOKIE_NAME: string

export function parseCookies(header: string | undefined): Record<string, string>

export function getRefreshTokenFromRequest(req: {
  cookies?: Record<string, string>
  body?: { refreshToken?: string }
}): string | null

export function setRefreshTokenCookie(
  res: { append: (name: string, value: string) => void },
  token: string
): void

export function clearRefreshTokenCookie(res: { append: (name: string, value: string) => void }): void
