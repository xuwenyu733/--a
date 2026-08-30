import SearchHistory from '../models/SearchHistory.js'

const MAX_ITEMS = 10

export async function saveSearch(user, keyword) {
  const kw = (keyword || '').trim()
  if (!kw || kw.length < 1) return null
  await SearchHistory.findOneAndUpdate(
    { userId: user._id, keyword: kw },
    { userId: user._id, regionId: user.regionId, keyword: kw },
    { upsert: true, new: true }
  )
  const count = await SearchHistory.countDocuments({ userId: user._id })
  if (count > MAX_ITEMS) {
    const oldest = await SearchHistory.find({ userId: user._id })
      .sort({ updatedAt: 1 })
      .limit(count - MAX_ITEMS)
      .select('_id')
    await SearchHistory.deleteMany({ _id: { $in: oldest.map((o) => o._id) } })
  }
  return kw
}

export async function listSearchHistory(userId) {
  return SearchHistory.find({ userId }).sort({ updatedAt: -1 }).limit(MAX_ITEMS)
}

export async function clearSearchHistory(userId) {
  await SearchHistory.deleteMany({ userId })
}

export async function removeSearchItem(userId, id) {
  await SearchHistory.deleteOne({ _id: id, userId })
}
