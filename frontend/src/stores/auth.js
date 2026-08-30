import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { ROLE_HOME_MAP } from '@/constants/roles'
import { pickUserForSession } from '@/utils/userSession'

/** accessToken 仅存内存，降低 XSS 持久化风险；refresh 在 httpOnly Cookie */
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref('')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const user = ref(JSON.parse(sessionStorage.getItem('user') || 'null'))
  const mustChangePassword = computed(() => !!user.value?.mustChangePassword)

  const isLoggedIn = computed(() => !!accessToken.value && !!user.value)
  const role = computed(() => user.value?.role)
  const homePath = computed(() => ROLE_HOME_MAP[user.value?.role] || '/')

  function persistUser(u) {
    if (!u) return
    user.value = u
    sessionStorage.setItem('user', JSON.stringify(pickUserForSession(u)))
  }

  function setTokens({ accessToken: at, refreshToken: rt, user: u }) {
    accessToken.value = at
    if (u) persistUser(u)
    localStorage.removeItem('accessToken')
    if (rt) {
      refreshToken.value = rt
      localStorage.setItem('refreshToken', rt)
    } else {
      refreshToken.value = ''
      localStorage.removeItem('refreshToken')
    }
  }

  function logout() {
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    sessionStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  async function login(credentials) {
    const data = await authApi.login(credentials)
    setTokens({ accessToken: data.accessToken, user: data.user })
    return data
  }

  async function register(payload) {
    const data = await authApi.register(payload)
    setTokens({ accessToken: data.accessToken, user: data.user })
    return data
  }

  async function fetchMe() {
    const data = await authApi.getMe()
    user.value = data.user
    sessionStorage.setItem('user', JSON.stringify(pickUserForSession(data.user)))
    return data
  }

  async function changePassword(payload) {
    await authApi.changePassword(payload)
    if (user.value) {
      const next = { ...user.value, mustChangePassword: false }
      user.value = next
      sessionStorage.setItem('user', JSON.stringify(pickUserForSession(next)))
    }
  }

  async function tryRefreshSession() {
    try {
      const legacy = refreshToken.value || undefined
      const data = await authApi.refreshToken(legacy)
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      })
      if (!data.user) {
        await fetchMe()
      }
      return true
    } catch {
      return false
    }
  }

  async function restoreSession() {
    localStorage.removeItem('accessToken')
    if (accessToken.value) {
      try {
        await fetchMe()
        return true
      } catch {
        accessToken.value = ''
      }
    }
    const ok = await tryRefreshSession()
    if (!ok) logout()
    return ok
  }

  return {
    accessToken,
    refreshToken,
    user,
    mustChangePassword,
    isLoggedIn,
    role,
    homePath,
    setTokens,
    logout,
    login,
    register,
    fetchMe,
    changePassword,
    restoreSession,
    tryRefreshSession,
  }
})
