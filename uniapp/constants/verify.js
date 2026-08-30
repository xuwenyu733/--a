export const VERIFY_STATUS_LABELS = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

export const STUDENT_VERIFY_BENEFITS = [
  '发布与编辑闲置商品',
  '购买其他同学的商品',
  '申请商家入驻、骑手认证',
]

export const MERCHANT_VERIFY_BENEFITS = [
  '开设认证商家店铺',
  '发布店铺商品（无需学生认证）',
  '独立店铺页展示',
]

export const COURIER_VERIFY_BENEFITS = [
  '进入跑腿接单大厅',
  '接取外卖/快递等跑腿订单',
  '管理配送中的订单',
]

export function verifyBadge(status) {
  if (!status) return ''
  return VERIFY_STATUS_LABELS[status] || status
}

export function canSubmitStudent(user, status) {
  return user?.role === 'student' && !user?.studentVerified && status?.student?.status !== 'pending'
}

export function canSubmitMerchant(user, status) {
  return user?.role === 'student' && status?.merchant?.status !== 'pending'
}

export function canSubmitCourier(user, status) {
  return !user?.courierVerified && status?.courier?.status !== 'pending'
}
