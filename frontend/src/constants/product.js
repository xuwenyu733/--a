export const CATEGORIES = [
  { value: 'book', label: '书籍教材' },
  { value: 'electronics', label: '电子产品' },
  { value: 'daily', label: '生活用品' },
  { value: 'clothing', label: '服饰鞋包' },
  { value: 'other', label: '其他' },
]

export const TRADE_MODES = [
  { value: 'sell', label: '出售' },
  { value: 'exchange', label: '以物换物' },
]

export const CONDITIONS = [
  { value: 'new', label: '全新' },
  { value: 'like_new', label: '几乎全新' },
  { value: 'good', label: '成色良好' },
  { value: 'fair', label: '有使用痕迹' },
]

export const GROUP_BUY_STATUS_LABELS = {
  open: '拼单中',
  success: '已满员',
  cancelled: '已关闭',
}

export const STATUS_LABELS = {
  on_sale: '在售',
  sold: '已售出',
  off_shelf: '已下架',
  rejected: '违规下架',
}

export const SORT_OPTIONS = [
  { value: 'createdAt', label: '最新发布' },
  { value: 'price', label: '价格' },
  { value: 'favoriteCount', label: '最多收藏' },
  { value: 'viewCount', label: '最多浏览' },
]
