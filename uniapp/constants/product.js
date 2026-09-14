export const CATEGORIES = [
  { value: 'book', label: '书籍教材' },
  { value: 'electronics', label: '电子产品' },
  { value: 'daily', label: '生活用品' },
  { value: 'clothing', label: '服饰鞋包' },
  { value: 'other', label: '其他' },
]

export const CONDITIONS = [
  { value: 'new', label: '全新' },
  { value: 'like_new', label: '几乎全新' },
  { value: 'good', label: '成色良好' },
  { value: 'fair', label: '有使用痕迹' },
]

export const SORT_OPTIONS = [
  { value: 'createdAt', label: '最新发布', order: 'desc' },
  { value: 'price', label: '价格最低', order: 'asc' },
  { value: 'favoriteCount', label: '最多收藏', order: 'desc' },
  { value: 'viewCount', label: '最多浏览', order: 'desc' },
]

export const STATUS_LABELS = {
  on_sale: '在售',
  sold: '已售出',
  off_shelf: '已下架',
}

export function labelOf(list, value) {
  return list.find((i) => i.value === value)?.label || value || ''
}
