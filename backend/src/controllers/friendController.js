import * as friendService from '../services/friendService.js'
import { ErrorCodes, fail, success, httpStatusFromCode } from '../utils/response.js'

function handleServiceError(err, res, next) {
  if (err?.code && typeof err.code === 'number') {
    return fail(res, err.code, err.message, httpStatusFromCode(err.code))
  }
  return next(err)
}

export async function search(req, res, next) {
  try {
    const data = await friendService.searchUsers(req.user, {
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.pageSize,
    })
    return success(res, data)
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}

export async function list(req, res, next) {
  try {
    const data = await friendService.listFriends(req.user, {
      page: req.query.page,
      pageSize: req.query.pageSize,
    })
    return success(res, data)
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}

export async function listRequests(req, res, next) {
  try {
    const list = await friendService.listIncomingRequests(req.user)
    return success(res, { list })
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}

export async function sendRequest(req, res, next) {
  try {
    const data = await friendService.sendRequest(req.user, req.body)
    const msg = data.relation === 'friend' ? '已添加好友' : '好友申请已发送'
    return success(res, data, msg)
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}

export async function acceptRequest(req, res, next) {
  try {
    const doc = await friendService.acceptRequest(req.user, req.params.id)
    return success(res, { friendship: doc }, '已通过好友申请')
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}

export async function rejectRequest(req, res, next) {
  try {
    await friendService.rejectRequest(req.user, req.params.id)
    return success(res, null, '已拒绝')
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}

export async function remove(req, res, next) {
  try {
    await friendService.removeFriend(req.user, req.params.userId)
    return success(res, null, '已删除好友')
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}

export async function myCode(req, res, next) {
  try {
    const user = await friendService.ensureFriendCode(req.user)
    return success(res, { friendCode: user.friendCode })
  } catch (err) {
    return handleServiceError(err, res, next)
  }
}
