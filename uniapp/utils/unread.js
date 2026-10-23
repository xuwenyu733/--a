import { ref } from 'vue'
import { getNotifications } from '@/api/notification'
import { getConversations } from '@/api/chat'
import { connectWs, onWs } from '@/utils/ws'
import { WS_EVENTS } from '@/utils/wsEvents'
import { getUser, isLoggedIn } from '@/utils/auth'

export const notifyUnread = ref(0)
export const chatUnread = ref(0)

const TAB_CHAT_INDEX = 2
let wsInited = false
const listListeners = new Set()

const TAB_ROUTES = new Set([
  'pages/index/index',
  'pages/products/list',
  'pages/chat/list',
  'pages/user/index',
])

function isOnTabBarPage() {
  try {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    const route = (cur && (cur.route || cur.$page?.fullPath?.replace(/^\//, '').split('?')[0])) || ''
    return TAB_ROUTES.has(route)
  } catch {
    return false
  }
}

function updateTabBadge() {
  // 非 tab 页调用会报 removeTabBarBadge:fail not TabBar page
  if (!isOnTabBarPage()) return
  const n = chatUnread.value
  if (n > 0) {
    uni.setTabBarBadge({
      index: TAB_CHAT_INDEX,
      text: n > 99 ? '99+' : String(n),
      fail() {},
    })
  } else {
    uni.removeTabBarBadge({ index: TAB_CHAT_INDEX, fail() {} })
  }
}

export function setNotifyUnread(n) {
  notifyUnread.value = n
}

export function setChatUnread(n) {
  chatUnread.value = n
  updateTabBadge()
}

export async function refreshNotifyUnread() {
  if (!isLoggedIn()) {
    setNotifyUnread(0)
    return 0
  }
  try {
    const res = await getNotifications({ pageSize: 1 })
    setNotifyUnread(res.unreadCount || 0)
    return notifyUnread.value
  } catch {
    setNotifyUnread(0)
    return 0
  }
}

export async function refreshChatUnread() {
  if (!isLoggedIn()) {
    setChatUnread(0)
    return 0
  }
  try {
    const convs = (await getConversations()) || []
    const total = convs.reduce((s, c) => s + (c.unreadCount || 0), 0)
    setChatUnread(total)
    return total
  } catch {
    setChatUnread(0)
    return 0
  }
}

export async function refreshAllUnread() {
  await Promise.all([refreshNotifyUnread(), refreshChatUnread()])
}

export function clearUnreadBadges() {
  setNotifyUnread(0)
  setChatUnread(0)
}

function emitListUpdate(payload) {
  listListeners.forEach((fn) => {
    try { fn(payload) } catch { /* ignore */ }
  })
}

function patchConversationOnMessage({ message, conversationId }) {
  const user = getUser()
  const myId = user?._id?.toString?.() || user?._id
  const senderId = message?.senderId?._id?.toString?.() || message?.senderId?.toString?.()

  if (senderId && myId && senderId !== myId) {
    setChatUnread(chatUnread.value + 1)
  }

  emitListUpdate({ type: 'message', message, conversationId })
}

function onNotification(data) {
  if (data?.type === 'new_message') {
    refreshChatUnread()
  } else {
    refreshNotifyUnread()
  }
}

function onMessageRead({ conversationId }) {
  emitListUpdate({ type: 'read', conversationId })
  refreshChatUnread()
}

export function onChatListUpdate(handler) {
  listListeners.add(handler)
  return () => listListeners.delete(handler)
}

export function initUnreadListeners() {
  if (wsInited) return
  wsInited = true
  onWs(WS_EVENTS.NOTIFICATION, onNotification)
  onWs(WS_EVENTS.MESSAGE_RECEIVE, patchConversationOnMessage)
  onWs(WS_EVENTS.MESSAGE_READ, onMessageRead)
}

export function onSessionReady() {
  if (!isLoggedIn()) return Promise.resolve()
  // 延迟连接，避免阻塞首页首屏渲染
  setTimeout(() => connectWs(), 200)
  initUnreadListeners()
  return refreshAllUnread().catch((err) => console.warn('refreshAllUnread failed', err))
}
