export const CREDIT_LEVELS = [
  { min: 90, label: '优秀', type: 'success' },
  { min: 70, label: '良好', type: '' },
  { min: 50, label: '一般', type: 'warning' },
  { min: 0, label: '较低', type: 'danger' },
]

export function getCreditLevel(score) {
  const s = score ?? 100
  return CREDIT_LEVELS.find((l) => s >= l.min) || CREDIT_LEVELS[CREDIT_LEVELS.length - 1]
}

export const CREDIT_RULES = [
  '完成一笔交易：买卖双方各 +5 分',
  '举报成立（商品）：卖家 -10 分',
  '举报成立（用户）：当事人 -15 分',
  '交易好评（≥4 星）：+2 分',
  '交易差评（≤2 星）：-3 分',
  '信用分范围：0 ~ 200，默认 100 分',
]
