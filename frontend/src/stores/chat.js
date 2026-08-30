import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as chatApi from '@/api/chat'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref([])
  const totalUnread = ref(0)
  const ws = useWebSocket()

  function calcUnread() {
    totalUnread.value = conversations.value.reduce((s, c) => s + (c.unreadCount || 0), 0)
  }

  async function fetchConversations() {
    conversations.value = await chatApi.getConversations()
    calcUnread()
  }

  function upsertConversation(conv) {
    const idx = conversations.value.findIndex((c) => c._id === conv._id)
    if (idx >= 0) conversations.value[idx] = { ...conversations.value[idx], ...conv }
    else conversations.value.unshift(conv)
    calcUnread()
  }

  function patchConversationOnMessage({ message, conversationId }) {
    const auth = useAuthStore()
    const myId = auth.user?._id?.toString?.() || auth.user?._id
    const senderId = message.senderId?._id?.toString?.() || message.senderId?.toString?.()
    const conv = conversations.value.find((c) => c._id === conversationId || c._id?.toString?.() === conversationId)
    if (!conv) {
      chatApi
        .getConversation(conversationId)
        .then((fetched) => upsertConversation(fetched))
        .catch((err) => {
          console.warn('getConversation failed, refetching list', err)
          fetchConversations()
        })
      return
    }
    conv.lastMessage = {
      content: message.type === 'image' ? '[图片]' : message.content,
      type: message.type,
      senderId: message.senderId,
      createdAt: message.createdAt,
    }
    if (senderId && myId && senderId !== myId) {
      conv.unreadCount = (conv.unreadCount || 0) + 1
    }
    const idx = conversations.value.indexOf(conv)
    if (idx > 0) {
      conversations.value.splice(idx, 1)
      conversations.value.unshift(conv)
    }
    calcUnread()
  }

  let inited = false
  function initSocket() {
    if (inited) return
    inited = true
    ws.connect()
    ws.startHeartbeat()
    ws.on('message:receive', (payload) => {
      patchConversationOnMessage(payload)
    })
    ws.on('message:read', ({ conversationId }) => {
      const conv = conversations.value.find(
        (c) => c._id === conversationId || c._id?.toString?.() === conversationId
      )
      if (conv) {
        conv.unreadCount = 0
        calcUnread()
      } else {
        fetchConversations()
      }
    })
  }

  return {
    conversations,
    totalUnread,
    fetchConversations,
    upsertConversation,
    initSocket,
    ws,
  }
})
