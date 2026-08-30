import ProductBrowse from '../models/ProductBrowse.js'

const MAX_RECORDS_PER_USER = 100

export async function recordProductBrowse(userId, product) {
  if (!userId || !product?._id) return
  const uid = userId.toString()
  const pid = product._id.toString()
  await ProductBrowse.findOneAndUpdate(
    { userId: uid, productId: pid },
    {
      userId: uid,
      productId: pid,
      regionId: product.regionId?._id || product.regionId,
      category: product.category || '',
      viewedAt: new Date(),
    },
    { upsert: true, new: true }
  )
  const count = await ProductBrowse.countDocuments({ userId: uid })
  if (count > MAX_RECORDS_PER_USER) {
    const oldest = await ProductBrowse.find({ userId: uid })
      .sort({ viewedAt: 1 })
      .limit(count - MAX_RECORDS_PER_USER)
      .select('_id')
    if (oldest.length) {
      await ProductBrowse.deleteMany({ _id: { $in: oldest.map((o) => o._id) } })
    }
  }
}

/** 最近浏览过的分类（去重，按时间） */
export async function getRecentBrowseCategories(userId, limit = 5) {
  if (!userId) return []
  const rows = await ProductBrowse.find({ userId })
    .sort({ viewedAt: -1 })
    .limit(30)
    .select('category')
    .lean()
  const seen = new Set()
  const cats = []
  for (const r of rows) {
    if (!r.category || seen.has(r.category)) continue
    seen.add(r.category)
    cats.push(r.category)
    if (cats.length >= limit) break
  }
  return cats
}

export async function listRecentBrowseProducts(userId, limit = 8) {
  if (!userId) return []
  const rows = await ProductBrowse.find({ userId })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .select('productId')
    .lean()
  return rows.map((r) => r.productId)
}
