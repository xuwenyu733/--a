import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as notificationApi from '@/api/notification'

export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0)

  async function fetchUnread() {
    try {
      const res = await notificationApi.getNotifications({ pageSize: 1 })
      unreadCount.value = res.unreadCount || 0
    } catch {
      unreadCount.value = 0
    }
    return unreadCount.value
  }

  async function markAllRead() {
    await notificationApi.markAllNotificationsRead()
    unreadCount.value = 0
  }

  function setUnread(count) {
    unreadCount.value = count
  }

  return { unreadCount, fetchUnread, markAllRead, setUnread }
})
