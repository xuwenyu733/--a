import crypto from 'crypto'

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

/** @param {number} [length] */
export function generateFriendCode(length = 8) {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}
