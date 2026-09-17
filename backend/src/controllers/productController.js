import * as productService from '../services/productService.js'
import { ErrorCodes, fail, success } from '../utils/response.js'
import { CATEGORIES } from '../constants/product.js'
export async function getMeta(req, res) {
  return success(res, { categories: CATEGORIES })
}

export async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query
    const data = await productService.listProducts(query, req.user || null)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function recommended(req, res, next) {
  try {
    const { regionId, productId, limit } = req.query
    const data = await productService.getRecommendations({
      regionId: regionId || req.user?.regionId,
      productId,
      limit,
      userId: req.user?._id,
    })
    return success(res, data)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function detail(req, res, next) {
  try {
    const data = await productService.getProductDetail(req.params.id, req.user || null)
    return success(res, data)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, 404)
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const product = await productService.createProduct(req.user, req.body)
    return success(res, product, '发布成功')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, 403)
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.user, req.body)
    return success(res, product, '更新成功')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id, req.user)
    return success(res, null, '删除成功')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body
    const product = await productService.updateProductStatus(req.params.id, req.user, status)
    return success(res, product, '状态已更新')
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message, err.code === 40400 ? 404 : 403)
    next(err)
  }
}

export async function mine(req, res, next) {
  try {
    const data = await productService.listMyProducts(req.user._id, req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function toggleFavorite(req, res, next) {
  try {
    const data = await productService.toggleFavorite(req.user._id, req.params.id)
    return success(res, data)
  } catch (err) {
    if (err.code) return fail(res, err.code, err.message)
    next(err)
  }
}

export async function favorites(req, res, next) {
  try {
    const data = await productService.listFavorites(req.user._id, req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

export async function uploadImages(req, res, next) {
  try {
    if (!req.files?.length) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请选择图片')
    }
    const { persistUploadedFiles, pathsToPublicUrls } = await import('../services/storageService.js')
    const paths = await persistUploadedFiles(req.files)
    const urls = pathsToPublicUrls(paths)
    return success(res, { urls, paths })
  } catch (err) {
    next(err)
  }
}

export async function uploadVideo(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请选择视频')
    }
    const { persistUploadedFiles, pathsToPublicUrls } = await import('../services/storageService.js')
    const paths = await persistUploadedFiles([req.file])
    const urls = pathsToPublicUrls(paths)
    return success(res, { url: urls[0], path: paths[0] })
  } catch (err) {
    next(err)
  }
}
