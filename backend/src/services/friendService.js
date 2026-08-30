import mongoose from 'mongoose'
import User from '../models/User.js'
import Friendship from '../models/Friendship.js'
import { generateFriendCode } from '../utils/friendCode.js'
import { parsePagination, paginationMeta } from '../utils/pagination.js'
import { sanitizeUser } from '../utils/authHelpers.js'
import { notifyUser } from './notificationService.js'
import { ErrorCodes } from '../utils/response.js'

function pairIds(a, b) {
  const as = a.toString()
  const bs = b.toString()
  return as < bs
    ? { userLow: a, userHigh: b }
    : { userLow: b, userHigh: a }
}

function peerId(doc, me) {
  const meStr = me.toString()
  return doc.userLow.toString() === meStr ? doc.userHigh : doc.userLow
}

export async function ensureFriendCode(user) {
  if (!user) return user
  if (user.friendCode) return user
  for (let i = 0; i < 8; i += 1) {
    const code = generateFriendCode(8)
    try {
      user.friendCode = code
      await user.save()
      return user
    } catch (err) {
      if (err?.code !== 11000) throw err
    }
  }
  const err = new Error('好友号生成失败，请稍后重试')
  err.code = ErrorCodes.SERVER_ERROR
  throw err
}

async function findRelation(meId, otherId) {
  if (meId.toString() === otherId.toString()) return { status: 'self' }
  const pair = pairIds(meId, otherId)
  const doc = await Friendship.findOne(pair).lean()
  if (!doc) return { status: 'none' }
  if (doc.status === 'accepted') return { status: 'friend', friendshipId: doc._id }
  const outgoing = doc.requesterId.toString() === meId.toString()
  return {
    status: outgoing ? 'pending_out' : 'pending_in',
    friendshipId: doc._id,
  }
}

function publicCard(user, relation) {
  return {
    _id: user._id,
    nickname: user.nickname || '用户',
    avatar: user.avatar || '',
    friendCode: user.friendCode || '',
    studentVerified: !!user.studentVerified,
    role: user.role,
    regionId: user.regionId,
    relation: relation?.status || 'none',
    friendshipId: relation?.friendshipId || null,
  }
}

/**
 * Search by exact friendCode, or nickname contains (same campus when possible).
 */
export async function searchUsers(viewer, { q, page = 1, pageSize = 20 } = {}) {
  const keyword = String(q || '').trim()
  if (!keyword) {
    const err = new Error('请输入好友号或用户名')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }
  await ensureFriendCode(viewer)

  const { page: p, pageSize: ps, skip } = parsePagination({ page, pageSize })
  const code = keyword.toUpperCase()
  const baseFilter = {
    status: 'active',
    _id: { $ne: viewer._id },
  }

  let filter
  if (/^[A-Z0-9]{6,10}$/i.test(keyword)) {
    filter = { ...baseFilter, friendCode: code }
  } else {
    filter = {
      ...baseFilter,
      nickname: { $regex: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    }
    if (viewer.regionId) {
      filter.regionId = viewer.regionId
    }
  }

  const [list, total] = await Promise.all([
    User.find(filter)
      .select('nickname avatar friendCode studentVerified role regionId')
      .populate('regionId', 'name code')
      .sort({ nickname: 1 })
      .skip(skip)
      .limit(ps)
      .lean(),
    User.countDocuments(filter),
  ])

  const cards = await Promise.all(
    list.map(async (u) => {
      const relation = await findRelation(viewer._id, u._id)
      return publicCard(u, relation)
    })
  )

  return { list: cards, pagination: paginationMeta(p, ps, total) }
}

export async function sendRequest(viewer, { userId, friendCode } = {}) {
  await ensureFriendCode(viewer)

  let target = null
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error('用户 ID 无效')
      err.code = ErrorCodes.BAD_REQUEST
      throw err
    }
    target = await User.findById(userId)
  } else if (friendCode) {
    target = await User.findOne({ friendCode: String(friendCode).trim().toUpperCase() })
  } else {
    const err = new Error('请指定要添加的用户')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }

  if (!target || target.status !== 'active') {
    const err = new Error('用户不存在')
    err.code = ErrorCodes.NOT_FOUND
    throw err
  }
  if (target._id.toString() === viewer._id.toString()) {
    const err = new Error('不能添加自己为好友')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }

  const pair = pairIds(viewer._id, target._id)
  const existing = await Friendship.findOne(pair)
  if (existing) {
    if (existing.status === 'accepted') {
      const err = new Error('你们已经是好友了')
      err.code = ErrorCodes.CONFLICT
      throw err
    }
    if (existing.requesterId.toString() === viewer._id.toString()) {
      const err = new Error('好友申请已发送，请等待对方通过')
      err.code = ErrorCodes.CONFLICT
      throw err
    }
    // Opposite pending → auto accept
    existing.status = 'accepted'
    await existing.save()
    await notifyUser(target._id, {
      type: 'friend_accepted',
      title: '好友申请已通过',
      content: `${viewer.nickname || '用户'}已通过你的好友申请`,
      relatedId: viewer._id,
    })
    return { friendship: existing, relation: 'friend' }
  }

  const doc = await Friendship.create({
    ...pair,
    requesterId: viewer._id,
    status: 'pending',
  })

  await notifyUser(target._id, {
    type: 'friend_request',
    title: '新的好友申请',
    content: `${viewer.nickname || '用户'}想添加你为好友`,
    relatedId: viewer._id,
  })

  return { friendship: doc, relation: 'pending_out' }
}

export async function acceptRequest(viewer, friendshipId) {
  const doc = await Friendship.findById(friendshipId)
  if (!doc || doc.status !== 'pending') {
    const err = new Error('好友申请不存在或已处理')
    err.code = ErrorCodes.NOT_FOUND
    throw err
  }
  const me = viewer._id.toString()
  const isPeer = doc.userLow.toString() === me || doc.userHigh.toString() === me
  if (!isPeer || doc.requesterId.toString() === me) {
    const err = new Error('无权处理该申请')
    err.code = ErrorCodes.FORBIDDEN
    throw err
  }
  doc.status = 'accepted'
  await doc.save()

  const requesterId = doc.requesterId
  await notifyUser(requesterId, {
    type: 'friend_accepted',
    title: '好友申请已通过',
    content: `${viewer.nickname || '用户'}已通过你的好友申请`,
    relatedId: viewer._id,
  })

  return doc
}

export async function rejectRequest(viewer, friendshipId) {
  const doc = await Friendship.findById(friendshipId)
  if (!doc || doc.status !== 'pending') {
    const err = new Error('好友申请不存在或已处理')
    err.code = ErrorCodes.NOT_FOUND
    throw err
  }
  const me = viewer._id.toString()
  const isPeer = doc.userLow.toString() === me || doc.userHigh.toString() === me
  if (!isPeer || doc.requesterId.toString() === me) {
    const err = new Error('无权处理该申请')
    err.code = ErrorCodes.FORBIDDEN
    throw err
  }
  await doc.deleteOne()
  return null
}

export async function listFriends(viewer, { page = 1, pageSize = 50 } = {}) {
  await ensureFriendCode(viewer)
  const { page: p, pageSize: ps, skip } = parsePagination({ page, pageSize })
  const filter = {
    status: 'accepted',
    $or: [{ userLow: viewer._id }, { userHigh: viewer._id }],
  }
  const [docs, total] = await Promise.all([
    Friendship.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(ps).lean(),
    Friendship.countDocuments(filter),
  ])
  const ids = docs.map((d) => peerId(d, viewer._id))
  const users = await User.find({ _id: { $in: ids }, status: 'active' })
    .select('nickname avatar friendCode studentVerified role regionId')
    .populate('regionId', 'name code')
    .lean()
  const map = new Map(users.map((u) => [u._id.toString(), u]))
  const list = ids
    .map((id) => map.get(id.toString()))
    .filter(Boolean)
    .map((u) => publicCard(u, { status: 'friend' }))
  return { list, pagination: paginationMeta(p, ps, total) }
}

export async function listIncomingRequests(viewer) {
  const docs = await Friendship.find({
    status: 'pending',
    requesterId: { $ne: viewer._id },
    $or: [{ userLow: viewer._id }, { userHigh: viewer._id }],
  })
    .sort({ createdAt: -1 })
    .lean()

  const ids = docs.map((d) => d.requesterId)
  const users = await User.find({ _id: { $in: ids } })
    .select('nickname avatar friendCode studentVerified role regionId')
    .populate('regionId', 'name code')
    .lean()
  const map = new Map(users.map((u) => [u._id.toString(), u]))

  return docs
    .map((d) => {
      const u = map.get(d.requesterId.toString())
      if (!u) return null
      return {
        ...publicCard(u, { status: 'pending_in', friendshipId: d._id }),
        requestId: d._id,
        createdAt: d.createdAt,
      }
    })
    .filter(Boolean)
}

export async function removeFriend(viewer, otherUserId) {
  if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
    const err = new Error('用户 ID 无效')
    err.code = ErrorCodes.BAD_REQUEST
    throw err
  }
  const pair = pairIds(viewer._id, otherUserId)
  const doc = await Friendship.findOne(pair)
  if (!doc) {
    const err = new Error('好友关系不存在')
    err.code = ErrorCodes.NOT_FOUND
    throw err
  }
  await doc.deleteOne()
  return null
}

export async function getRelationStatus(viewerId, otherId) {
  return findRelation(viewerId, otherId)
}

export { sanitizeUser }
