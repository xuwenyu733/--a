export const CREDIT = {
  DEFAULT: 100,
  MIN: 0,
  MAX: 200,
  ORDER_COMPLETE: 5,
  REPORT_USER_PENALTY: -15,
  REPORT_PRODUCT_SELLER_PENALTY: -10,
}

export const CREDIT_LEVELS = [
  { min: 90, level: 'excellent', label: '优秀', type: 'success' },
  { min: 70, level: 'good', label: '良好', type: '' },
  { min: 50, level: 'normal', label: '一般', type: 'warning' },
  { min: 0, level: 'low', label: '较低', type: 'danger' },
]

export function getCreditLevel(score) {
  const s = score ?? CREDIT.DEFAULT
  return CREDIT_LEVELS.find((l) => s >= l.min) || CREDIT_LEVELS[CREDIT_LEVELS.length - 1]
}
