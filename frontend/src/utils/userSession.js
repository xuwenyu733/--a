/** sessionStorage 仅存展示与路由所需字段，避免持久化敏感信息 */
const SESSION_USER_KEYS = [
  '_id',
  'id',
  'nickname',
  'avatar',
  'role',
  'regionId',
  'studentVerified',
  'courierVerified',
  'merchantProfileId',
  'mustChangePassword',
  'creditScore',
]

export function pickUserForSession(user) {
  if (!user || typeof user !== 'object') return null
  const out = {}
  for (const key of SESSION_USER_KEYS) {
    if (user[key] !== undefined) out[key] = user[key]
  }
  if (!out._id && user._id) out._id = user._id
  return out
}
