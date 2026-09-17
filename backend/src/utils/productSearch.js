/** 商品关键词：短词用正则模糊，长词用 MongoDB 全文索引；纯字母支持拼音首字母 */
import { isPinyinLikeQuery } from './productPinyin.js'

/** 转义正则特殊字符，防注入 / ReDoS */
export function escapeRegExp(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function applyProductKeywordFilter(filter, keyword) {
  const kw = keyword?.trim()
  if (!kw) return false

  if (isPinyinLikeQuery(kw)) {
    const letters = kw.toLowerCase()
    const safe = escapeRegExp(letters)
    filter.$or = [
      { searchText: { $regex: safe, $options: 'i' } },
      { title: { $regex: safe, $options: 'i' } },
    ]
    return true
  }

  if (kw.length <= 4) {
    const safe = escapeRegExp(kw)
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { searchText: { $regex: safe, $options: 'i' } },
    ]
    return true
  }

  filter.$text = { $search: kw }
  return true
}

export function usesTextScore(keyword) {
  const kw = keyword?.trim()
  return kw && kw.length > 4 && !isPinyinLikeQuery(kw)
}
