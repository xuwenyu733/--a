<template>
  <view class="container">
    <view class="section-header card-head">
      <text class="section-title">通知中心</text>
      <text v-if="unreadCount" class="link" @tap="markAll">全部已读</text>
    </view>

    <NotifyListSkeleton v-if="loading && !list.length" />
    <LoadState
      v-else
      :loading="false"
      :error="loadError"
      :has-data="list.length > 0"
      empty-text="暂无通知"
      @retry="load"
    />
    <view
      v-for="n in list"
      :key="n._id"
      class="card notify-item"
      :class="{ unread: !n.read, clickable: canNavigate(n) }"
      @tap="onTap(n)"
    >
      <view class="head-row">
        <text v-if="typeLabel(n.type)" class="tag type-tag">{{ typeLabel(n.type) }}</text>
        <text class="title">{{ n.title }}</text>
      </view>
      <text class="content muted">{{ n.content }}</text>
      <text class="time muted">{{ formatTime(n.createdAt) }}</text>
      <text v-if="canNavigate(n)" class="link goto">查看详情 ›</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/api/notification'
import { ensureLogin } from '@/utils/auth'
import { formatTime } from '@/utils/format'
import { NAVIGABLE_TYPES, NOTIFICATION_TYPE_LABEL } from '@/constants/notification'
import { setNotifyUnread } from '@/utils/unread'
import LoadState from '@/components/LoadState.vue'
import NotifyListSkeleton from '@/components/NotifyListSkeleton.vue'

const loading = ref(false)
const loadError = ref('')
const list = ref([])
const unreadCount = ref(0)

onShow(() => {
  if (ensureLogin()) load()
})

onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()))

function typeLabel(type) {
  return NOTIFICATION_TYPE_LABEL[type] || ''
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getNotifications({ pageSize: 50 })
    list.value = res.list || []
    unreadCount.value = res.unreadCount || 0
    setNotifyUnread(unreadCount.value)
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function canNavigate(n) {
  if (n.type === 'new_message') return !!n.relatedId
  return n.relatedId && NAVIGABLE_TYPES.includes(n.type)
}

function navigate(n) {
  switch (n.type) {
    case 'delivery':
      uni.navigateTo({ url: '/pages/delivery/orders?role=poster' })
      break
    case 'new_message':
      uni.navigateTo({ url: `/pages/chat/room?id=${n.relatedId}` })
      break
    case 'price_drop':
    case 'group_buy_success':
    case 'group_buy_cancelled':
      uni.navigateTo({ url: `/pages/products/detail?id=${n.relatedId}` })
      break
    case 'order_status':
    case 'new_order':
    case 'trade_review':
    case 'order_payment':
      uni.navigateTo({ url: '/pages/orders/index' })
      break
    case 'friend_request':
      uni.navigateTo({ url: '/pages/user/friend-search' })
      break
    case 'friend_accepted':
      if (n.relatedId) {
        uni.navigateTo({ url: `/pages/user/profile?id=${n.relatedId}` })
      } else {
        uni.navigateTo({ url: '/pages/user/friend-search' })
      }
      break
    default:
      break
  }
}

async function onTap(n) {
  if (!canNavigate(n)) {
    if (!n.read) markOneRead(n)
    return
  }
  if (!n.read) await markOneRead(n)
  navigate(n)
}

async function markOneRead(n) {
  try {
    await markNotificationRead(n._id)
    n.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    setNotifyUnread(unreadCount.value)
  } catch { /* ignore */ }
}

async function markAll() {
  try {
    await markAllNotificationsRead()
    list.value = list.value.map((n) => ({ ...n, read: true }))
    unreadCount.value = 0
    setNotifyUnread(0)
    uni.showToast({ title: '已全部已读', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; padding: 0 8rpx; }
.notify-item.unread { border-left: 6rpx solid #409eff; }
.notify-item.clickable:active { opacity: 0.85; }
.head-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.type-tag { flex-shrink: 0; }
.title { font-weight: 600; font-size: 30rpx; }
.content { display: block; line-height: 1.5; margin-bottom: 8rpx; }
.time { display: block; font-size: 22rpx; }
.goto { display: block; margin-top: 8rpx; font-size: 26rpx; }
</style>
