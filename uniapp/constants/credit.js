export const CREDIT_LEVELS = [
  { min: 90, level: 'excellent', label: '优秀', type: 'success' },
  { min: 70, level: 'good', label: '良好', type: 'info' },
  { min: 50, level: 'normal', label: '一般', type: 'warning' },
  { min: 0, level: 'low', label: '较低', type: 'danger' },
]

export function getCreditLevel(score) {
  const s = score ?? 100
  return CREDIT_LEVELS.find((l) => s >= l.min) || CREDIT_LEVELS[CREDIT_LEVELS.length - 1]
}

export function starsText(rating) {
  const n = Math.round(Number(rating) || 0)
  return '★'.repeat(Math.min(5, n)) + '☆'.repeat(Math.max(0, 5 - n))
}
