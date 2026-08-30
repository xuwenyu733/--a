import Notification from '../models/Notification.js'
import { success } from '../utils/response.js'
import { paginationMeta } from '../utils/pagination.js'

export async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.validatedQuery || req.query
    const skip = (Number(page) - 1) * Number(pageSize)
    const filter = { userId: req.user._id }
    const [list, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, read: { $ne: true } }),
    ])
    return success(res, {
      list,
      unreadCount,
      pagination: paginationMeta(Number(page), Number(pageSize), total),
    })
  } catch (err) {
    next(err)
  }
}

export async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: { $ne: true } },
      { $set: { read: true } }
    )
    return success(res, null, '已全部标记已读')
  } catch (err) {
    next(err)
  }
}

export async function markOneRead(req, res, next) {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } }
    )
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: { $ne: true },
    })
    return success(res, { unreadCount })
  } catch (err) {
    next(err)
  }
}
