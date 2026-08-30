import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { handleAuthError, clearAuthAndRedirect } from '@/utils/authSession'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

/** 兼容简历模块 { success, data } 与主应用 { code: 0, data } */
function unwrapResumeBody(body) {
  if (!body || typeof body !== 'object') return body
  if (body.success === false) {
    throw new Error(body.message || '请求失败')
  }
  if (body.code !== undefined && body.code !== 0) {
    throw new Error(body.message || '请求失败')
  }
  if (body.data !== undefined && (body.success === true || body.code === 0)) {
    return body.data
  }
  return body
}

api.interceptors.response.use(
  (res) => unwrapResumeBody(res.data),
  async (err) => {
    const retried = await handleAuthError(err, err.config, (cfg) => api(cfg))
    if (retried !== null) return retried

    const status = err.response?.status
    let message = err.response?.data?.message || err.message || '请求失败'
    if (status === 401) {
      clearAuthAndRedirect()
      message = '登录已失效，请重新登录'
    }
    if (status === 502 || status === 503) {
      message = '简历服务暂不可用，请确认后端已启动且已配置 OPENAI_API_KEY'
    }
    return Promise.reject(new Error(message))
  }
)

function authHeaders() {
  const auth = useAuthStore()
  return auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}
}

export function uploadResumePhoto(file) {
  const formData = new FormData()
  formData.append('photo', file)
  return api.post('/resume/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

export function generateResumeFromForm(form) {
  return api.post('/resume/generate', form, { timeout: 180000 })
}

async function parseExportBlobResponse(res) {
  const blob = res.data
  if (blob.type?.includes('application/json')) {
    const text = await blob.text()
    const json = JSON.parse(text)
    throw new Error(json.message || '导出失败')
  }
  return { blob, contentType: res.headers['content-type'] }
}

async function handleExportError(err) {
  if (err.response?.status === 401) {
    clearAuthAndRedirect()
    throw new Error('登录已失效，请重新登录')
  }
  if (err.response?.status === 502 || err.response?.status === 503) {
    throw new Error('简历服务暂不可用')
  }
  if (err.response?.data instanceof Blob) {
    const text = await err.response.data.text()
    try {
      const json = JSON.parse(text)
      throw new Error(json.message || '导出失败')
    } catch (parseErr) {
      if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr
    }
  }
  throw err
}

export async function exportResume({ content, format, fileName, template, photoUrl, builderData }) {
  try {
    const res = await axios.post(
      `${API_BASE}/resume/export`,
      { content, format, fileName, template, photoUrl, builderData },
      {
        responseType: 'blob',
        timeout: 60000,
        withCredentials: true,
        headers: authHeaders(),
      }
    )
    return parseExportBlobResponse(res)
  } catch (err) {
    return handleExportError(err)
  }
}

export async function exportXlsxAsPdf(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await axios.post(`${API_BASE}/resume/export-xlsx-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() },
      responseType: 'blob',
      timeout: 120000,
      withCredentials: true,
    })
    return parseExportBlobResponse(res)
  } catch (err) {
    return handleExportError(err)
  }
}
