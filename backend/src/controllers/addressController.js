import * as addressService from '../services/addressService.js'
import { success } from '../utils/response.js'

export async function list(req, res, next) {
  try {
    const data = await addressService.listAddresses(req.user._id)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const address = await addressService.createAddress(req.user, req.body)
    return success(res, address, '已添加')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const address = await addressService.updateAddress(req.user, req.params.id, req.body)
    return success(res, address, '已更新')
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    await addressService.deleteAddress(req.user, req.params.id)
    return success(res, null, '已删除')
  } catch (err) {
    next(err)
  }
}

export async function setDefault(req, res, next) {
  try {
    const address = await addressService.setDefaultAddress(req.user, req.params.id)
    return success(res, address, '已设为默认')
  } catch (err) {
    next(err)
  }
}
