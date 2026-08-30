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

export const ROLE_LABELS = {
  [ROLES.STUDENT]: '学生',
  [ROLES.MERCHANT]: '商家',
  [ROLES.REGIONAL_AGENT]: '区域代理',
  [ROLES.SUPER_ADMIN]: '超级管理员',
}
