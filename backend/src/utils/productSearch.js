/** 商品关键词：短词用正则模糊，长词用 MongoDB 全文索引；纯字母支持拼音首字母 */
import { isPinyinLikeQuery } from './productPinyin.js'

export function applyProductKeywordFilter(filter, keyword) {
  const kw = keyword?.trim()
  if (!kw) return false

  if (isPinyinLikeQuery(kw)) {
    const letters = kw.toLowerCase()
    filter.$or = [
      { searchText: { $regex: letters, $options: 'i' } },
      { title: { $regex: letters, $options: 'i' } },
    ]
    return true
  }

  if (kw.length <= 4) {
    filter.$or = [
      { title: { $regex: kw, $options: 'i' } },
      { description: { $regex: kw, $options: 'i' } },
      { searchText: { $regex: kw, $options: 'i' } },
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
