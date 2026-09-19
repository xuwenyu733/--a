import config from '@/config/index'
import { getAccessToken } from './auth'
import {
  parseResponseBody,
  refreshAccessTokenOnce,
  handleSessionExpired,
  shouldRetryAuth,
} from './authRetry'

function parseUploadResponse(res) {
  const body = parseResponseBody(res.data)
  if (!body || typeof body.code === 'undefined') {
    throw new Error('上传响应解析失败')
  }
  if (body.code !== 0) throw new Error(body.message || '上传失败')
  return body.data
}

export function pickUploadPath(data) {
  return data?.paths?.[0] ?? data?.urls?.[0] ?? ''
}

export function uploadProductImage(filePath, canRetry = true) {
  const token = getAccessToken()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${config.API_BASE}/products/upload`,
      filePath,
      name: 'images',
      header: {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client': 'miniprogram',
      },
      success: (res) => {
        const body = parseResponseBody(res.data)
        if (canRetry && shouldRetryAuth(body, Boolean(token))) {
          refreshAccessTokenOnce()
            .then(() => uploadProductImage(filePath, false).then(resolve).catch(reject))
            .catch(() => handleSessionExpired(reject))
          return
        }
        try {
          resolve(parseUploadResponse(res))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '上传失败')),
    })
  })
}

/** 并发上传多张图片，返回所有成功上传的 URL 数组 */
export function uploadProductImages(filePaths) {
  return Promise.all(filePaths.map((fp) => uploadProductImage(fp).catch(() => null)))
    .then((results) => results.filter(Boolean))
}

export function uploadProductVideo(filePath, canRetry = true) {
  const token = getAccessToken()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${config.API_BASE}/products/upload-video`,
      filePath,
      name: 'video',
      header: {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client': 'miniprogram',
      },
      success: (res) => {
        const body = parseResponseBody(res.data)
        if (canRetry && shouldRetryAuth(body, Boolean(token))) {
          refreshAccessTokenOnce()
            .then(() => uploadProductVideo(filePath, false).then(resolve).catch(reject))
            .catch(() => handleSessionExpired(reject))
          return
        }
        try {
          resolve(parseUploadResponse(res))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '视频上传失败')),
    })
  })
}
