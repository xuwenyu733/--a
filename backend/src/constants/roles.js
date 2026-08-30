export const ROLES = {
  STUDENT: 'student',
  MERCHANT: 'merchant',
  REGIONAL_AGENT: 'regional_agent',
  SUPER_ADMIN: 'super_admin',
}

export const ROLE_HOME_MAP = {
  [ROLES.STUDENT]: '/',
  [ROLES.MERCHANT]: '/merchant',
  [ROLES.REGIONAL_AGENT]: '/agent',
  [ROLES.SUPER_ADMIN]: '/admin',
}
