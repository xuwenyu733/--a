import axios from 'axios'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import { attachAuthInterceptors, clearAuthAndRedirect } from '@/utils/authSession'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 15000,
  withCredentials: true,
})

attachAuthInterceptors(request)

let last429At = 0

request.interceptors.response.use(
  (data) => data,
  (error) => {
    const resData = error.response?.data
    const msg = resData?.message || error.message || '网络错误'
    const url = error.config?.url || ''
    const isLoginAttempt = /\/auth\/(login|wechat-login)/.test(url)
    const isUnauthenticatedRequest = !error.config?.headers?.Authorization
    const status = error.response?.status
    const is429 = status === 429 || resData?.code === 40029

    if (isLoginAttempt) {
      return Promise.reject(error)
    }
    if (is429) {
      const now = Date.now()
      if (now - last429At > 3000) {
        last429At = now
        ElMessage.warning(msg || '请求过于频繁，请稍后再试')
      }
      return Promise.reject(error)
    }
    if (status === 401 && isUnauthenticatedRequest) {
      ElMessage.error(msg)
    } else if (status !== 401) {
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  }
)

export { clearAuthAndRedirect }
export default request
