import config from '@/config/index'
import { getAccessToken } from './auth'
import {
  parseResponseBody,
  refreshAccessTokenOnce,
  handleSessionExpired,
  shouldRetryAuth,
} from './authRetry'

function parseErrorFromBuffer(buffer) {
  if (!buffer) return '导出失败'
  try {
    const text = typeof buffer === 'string'
      ? buffer
      : new TextDecoder('utf-8').decode(buffer)
    const json = parseResponseBody(text)
    return json?.message || json?.msg || '导出失败'
  } catch {
    return '导出失败'
  }
}

function getUserDataPath() {
  if (typeof uni !== 'undefined' && uni.env?.USER_DATA_PATH) return uni.env.USER_DATA_PATH
  if (typeof wx !== 'undefined' && wx.env?.USER_DATA_PATH) return wx.env.USER_DATA_PATH
  return ''
}

function writeAndOpenPdf(arrayBuffer) {
  const basePath = getUserDataPath()
  if (!basePath) return Promise.reject(new Error('当前环境不支持 PDF 预览'))

  const filePath = `${basePath}/resume-${Date.now()}.pdf`
  const fs = uni.getFileSystemManager()

  return new Promise((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: arrayBuffer,
      success() {
        uni.openDocument({
          filePath,
          fileType: 'pdf',
          showMenu: true,
          success: () => resolve(filePath),
          fail: (err) => reject(new Error(err?.errMsg || '无法打开 PDF')),
        })
      },
      fail: (err) => reject(new Error(err?.errMsg || '保存 PDF 失败')),
    })
  })
}

export function exportAndOpenResumePdf(payload, canRetry = true) {
  const token = getAccessToken()
  if (!payload?.content?.trim()) {
    return Promise.reject(new Error('简历内容为空'))
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${config.API_BASE}/resume/export`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client': 'miniprogram',
      },
      data: {
        content: payload.content.trim(),
        format: 'pdf',
        fileName: payload.fileName || '我的简历',
        template: payload.template || 'classic-green',
        photoUrl: payload.photoUrl || '',
        builderData: payload.builderData || null,
      },
      responseType: 'arraybuffer',
      timeout: 120000,
      success(res) {
        if (res.statusCode !== 200) {
          const errBody = res.data instanceof ArrayBuffer
            ? parseResponseBody(new TextDecoder('utf-8').decode(res.data))
            : parseResponseBody(res.data)

          if (canRetry && shouldRetryAuth(errBody, Boolean(token))) {
            refreshAccessTokenOnce()
              .then(() => exportAndOpenResumePdf(payload, false).then(resolve).catch(reject))
              .catch(() => handleSessionExpired(reject))
            return
          }

          reject(new Error(parseErrorFromBuffer(res.data)))
          return
        }

        writeAndOpenPdf(res.data).then(resolve).catch(reject)
      },
      fail(err) {
        reject(new Error(err?.errMsg || '导出请求失败'))
      },
    })
  })
}
