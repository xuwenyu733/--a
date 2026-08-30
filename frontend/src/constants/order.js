export const ORDER_STATUS_LABELS = {
  pending: '待确认',
  confirmed: '待付款',
  completed: '已完成',
  cancelled: '已取消',
}

export const ORDER_STATUS_TYPE = {
  pending: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'info',
}

export const PAYMENT_STATUS_LABELS = {
  none: '',
  pending_online: '待完成在线支付',
  buyer_marked: '待卖家确认收款',
  seller_confirmed: '卖家已确认收款',
  paid_online: '已在线支付',
}

export const PAYMENT_METHOD_LABELS = {
  manual: '扫码转账',
  wechat: '微信支付',
  alipay: '支付宝',
}
