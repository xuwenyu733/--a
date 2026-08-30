/** @param {string} password */
export function validatePassword(password: string): string | null

/** @param {Record<string, unknown>} user @param {{ self?: boolean }} [options] */
export function sanitizeUser(
  user: Record<string, unknown>,
  options?: { self?: boolean }
): Record<string, unknown>
