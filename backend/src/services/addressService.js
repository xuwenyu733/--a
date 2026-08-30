import UserAddress from '../models/UserAddress.js'

const MAX_ADDRESSES = 20

function notFound() {
  const err = new Error('地址不存在')
  err.code = 40400
  return err
}

function forbidden() {
  const err = new Error('无权操作此地址')
  err.code = 40301
  return err
}

async function clearDefault(userId) {
  await UserAddress.updateMany({ userId }, { $set: { isDefault: false } })
}

async function promoteDefaultIfNeeded(userId, excludeId) {
  const next = await UserAddress.findOne({ userId, _id: { $ne: excludeId } }).sort({ createdAt: -1 })
  if (next && !next.isDefault) {
    await clearDefault(userId)
    next.isDefault = true
    await next.save()
  }
}

export async function listAddresses(userId) {
  const list = await UserAddress.find({ userId }).sort({ isDefault: -1, updatedAt: -1 }).lean()
  return { list }
}

export async function createAddress(user, payload) {
  const count = await UserAddress.countDocuments({ userId: user._id })
  if (count >= MAX_ADDRESSES) {
    const err = new Error(`最多保存 ${MAX_ADDRESSES} 个地址`)
    err.code = 40000
    throw err
  }
  const isDefault = count === 0
  if (isDefault) await clearDefault(user._id)
  const address = await UserAddress.create({
    userId: user._id,
    name: payload.name,
    phone: payload.phone,
    region: payload.region || '',
    detail: payload.detail,
    isDefault,
  })
  return address
}

export async function updateAddress(user, addressId, payload) {
  const address = await UserAddress.findOne({ _id: addressId, userId: user._id })
  if (!address) throw notFound()
  if (payload.name !== undefined) address.name = payload.name
  if (payload.phone !== undefined) address.phone = payload.phone
  if (payload.region !== undefined) address.region = payload.region
  if (payload.detail !== undefined) address.detail = payload.detail
  await address.save()
  return address
}

export async function deleteAddress(user, addressId) {
  const address = await UserAddress.findOne({ _id: addressId, userId: user._id })
  if (!address) throw notFound()
  const wasDefault = address.isDefault
  await address.deleteOne()
  if (wasDefault) await promoteDefaultIfNeeded(user._id, addressId)
  return null
}

export async function setDefaultAddress(user, addressId) {
  const address = await UserAddress.findOne({ _id: addressId, userId: user._id })
  if (!address) throw notFound()
  await clearDefault(user._id)
  address.isDefault = true
  await address.save()
  return address
}
