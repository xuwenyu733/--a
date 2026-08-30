import config from '@/config/index'
import { getAccessToken } from './auth'

function parseUploadResponse(res) {
  let body = res.data
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      throw new Error('上传响应解析失败')
    }
  }
  if (body.code !== 0) throw new Error(body.message || '上传失败')
  return body.data
}

export function pickUploadPath(data) {
  return data?.paths?.[0] ?? data?.urls?.[0] ?? ''
}

export function uploadProductImage(filePath) {
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
