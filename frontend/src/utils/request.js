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

request.interceptors.response.use(
  (data) => data,
  (error) => {
    const resData = error.response?.data
    const msg = resData?.message || error.message || '网络错误'
    const url = error.config?.url || ''
    const isLoginAttempt = /\/auth\/(login|wechat-login)/.test(url)
    const isUnauthenticatedRequest = !error.config?.headers?.Authorization

    // 登录页自己展示错误（含表单内提示），此处不再弹，避免重复
    if (isLoginAttempt) {
      return Promise.reject(error)
    }
    if (error.response?.status === 401 && isUnauthenticatedRequest) {
      ElMessage.error(msg)
    } else if (error.response?.status !== 401) {
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  }
)

export { clearAuthAndRedirect }
export default request
