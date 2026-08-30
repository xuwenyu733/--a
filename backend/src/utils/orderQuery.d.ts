export function activeOrderFilter(extra?: Record<string, unknown>): Record<string, unknown>

export function isOrderDeleted(order: { deletedAt?: unknown } | null | undefined): boolean
