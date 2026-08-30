export const MAX_MESSAGE_CONTENT_LENGTH: number

export function sortParticipantIds(a: unknown, b: unknown): [unknown, unknown]

export function validateSelfChat(
  userId: unknown,
  receiverId: unknown
): { ok: true } | { ok: false; message: string; code: number }

export function validateConversationParticipant(
  participants: unknown[],
  userId: unknown,
  options?: { forbiddenMessage?: string }
): { ok: true } | { ok: false; message: string; code: number }

export function validateMessageContent(
  content: string,
  type: string,
  maxLen?: number
): { ok: true } | { ok: false; message: string; code: number }

export function validateContactSeller(
  buyerId: unknown,
  sellerId: unknown
): { ok: true } | { ok: false; message: string; code: number }

export function buildLastMessagePreview(
  type: string,
  content: string
): { content: string; type: string }

export function formatConversationForUser(
  conversation: Record<string, unknown>,
  userId: unknown
): Record<string, unknown>

export function sumUnreadCounts(conversations: unknown[], userId: unknown): number
