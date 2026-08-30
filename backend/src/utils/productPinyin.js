import { pinyin } from 'pinyin-pro'

/** 为商品标题生成搜索辅助串（全拼 + 首字母） */
export function buildProductSearchText(title) {
  if (!title?.trim()) return ''
  const t = title.trim()
  try {
    const full = pinyin(t, { toneType: 'none', type: 'array' }).join('').toLowerCase()
    const first = pinyin(t, { pattern: 'first', toneType: 'none', type: 'array' }).join('').toLowerCase()
    return `${t} ${full} ${first}`
  } catch {
    return t
  }
}

/** 是否为纯字母拼音/缩写查询 */
export function isPinyinLikeQuery(keyword) {
  return /^[a-zA-Z]{2,20}$/.test(keyword?.trim() || '')
}
