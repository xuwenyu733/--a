import { getMe } from '@/api/auth'
import { getVerifyStatus } from '@/api/user'
import { getUser, saveSession, getAccessToken, getRefreshToken } from '@/utils/auth'

/** 刷新本地用户信息与三类认证状态 */
export async function refreshUserAndVerify() {
  let user = getUser()
  try {
    const data = await getMe()
    if (data?.user) {
      saveSession({
        user: data.user,
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      })
      user = data.user
    }
  } catch {
    /* 使用缓存用户 */
  }
  let status = null
  let verifyError = ''
  try {
    status = await getVerifyStatus()
  } catch (e) {
    verifyError = e.message || '加载认证状态失败'
    status = null
  }
  return { user, status, verifyError }
}

export function formatVerifyTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
