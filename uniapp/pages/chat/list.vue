<template>
  <view class="page">
    <!-- 顶部工具栏：右上角搜索好友 -->
    <view class="toolbar">
      <text class="toolbar-tip">聊天列表</text>
      <view class="toolbar-search" @tap="toggleSearch">
        <text class="toolbar-search-icon">{{ searching ? '取消' : '🔍 搜索好友' }}</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view v-if="searching" class="search-panel">
      <view class="search-box">
        <text class="search-leading">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          focus
          confirm-type="search"
          placeholder="搜索好友昵称"
          placeholder-class="search-ph"
          @confirm="hideKeyboard"
        />
        <text v-if="keyword" class="search-clear" @tap="clearKeyword">清除</text>
      </view>
    </view>

    <view class="container list-body">
      <ConversationListSkeleton v-if="loggedIn && loading && !list.length" />
      <LoadState
        v-else-if="loggedIn && !searching"
        :loading="false"
        :error="loadError"
        :has-data="list.length > 0"
        empty-text="暂无会话，去商品页联系卖家吧"
        @retry="loadList"
      />
      <view v-else-if="loggedIn && searching && !filteredList.length" class="empty">
        {{ keyword.trim() ? '未找到相关好友' : '输入昵称搜索好友' }}
      </view>

      <view
        v-for="item in displayList"
        :key="item._id"
        class="card conv"
        @tap="openRoom(item)"
      >
        <view class="avatar">{{ (item.peerName || '用')[0] }}</view>
        <view class="body">
          <view class="row">
            <text class="name">{{ item.peerName }}</text>
            <text class="muted">{{ item.timeText }}</text>
          </view>
          <text class="preview muted">{{ item.lastMessage }}</text>
          <text v-if="item.productTitle" class="product muted">关联：{{ item.productTitle }}</text>
        </view>
        <view v-if="item.unreadCount" class="badge">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onShow, onPullDownRefresh, onUnload } from '@dcloudio/uni-app'
import { getConversations } from '@/api/chat'
import { isLoggedIn, promptLogin, getUser } from '@/utils/auth'
import { formatTime, previewMessage } from '@/utils/format'
import { onChatListUpdate, refreshChatUnread, initUnreadListeners } from '@/utils/unread'
import LoadState from '@/components/LoadState.vue'
import ConversationListSkeleton from '@/components/ConversationListSkeleton.vue'

const loggedIn = ref(false)
const loading = ref(false)
const loadError = ref('')
const list = ref([])
const searching = ref(false)
const keyword = ref('')

let offUpdate = null

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter((item) => {
    const name = (item.peerName || '').toLowerCase()
    const product = (item.productTitle || '').toLowerCase()
    return name.includes(kw) || product.includes(kw)
  })
})

const displayList = computed(() => (searching.value ? filteredList.value : list.value))

onShow(async () => {
  loggedIn.value = isLoggedIn()
  if (!loggedIn.value) {
    list.value = []
    searching.value = false
    keyword.value = ''
    await promptLogin({ content: '登录后即可查看消息、联系卖家' })
    return
  }
  initUnreadListeners()
  if (!offUpdate) {
    offUpdate = onChatListUpdate(handleRealtimeUpdate)
  }
  loadList()
})

onPullDownRefresh(() => {
  if (!loggedIn.value) {
    uni.stopPullDownRefresh()
    return
  }
  loadList().finally(() => uni.stopPullDownRefresh())
})

onUnmounted(() => {
  cleanup()
})

onUnload(() => {
  cleanup()
})

function cleanup() {
  if (offUpdate) {
    offUpdate()
    offUpdate = null
  }
}

function mapConv(c) {
  return {
    ...c,
    peerName: c.peer?.nickname || '用户',
    timeText: formatTime(c.lastMessageAt || c.updatedAt),
    lastMessage: previewMessage(c.lastMessage),
    productTitle: c.productId?.title || c.product?.title || '',
  }
}

async function loadList() {
  loading.value = true
  loadError.value = ''
  try {
    const data = (await getConversations()) || []
    list.value = data.map(mapConv)
    await refreshChatUnread()
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleRealtimeUpdate({ type, message, conversationId }) {
  if (!loggedIn.value) return
  const cid = conversationId?._id?.toString?.() || conversationId?.toString?.() || conversationId

  if (type === 'read') {
    const conv = list.value.find((c) => matchId(c._id, cid))
    if (conv) conv.unreadCount = 0
    return
  }

  if (type !== 'message' || !message) return

  const user = getUser()
  const myId = user?._id?.toString?.() || user?._id
  const senderId = message.senderId?._id?.toString?.() || message?.senderId?.toString?.()
  const fromPeer = senderId && myId && senderId !== myId

  let conv = list.value.find((c) => matchId(c._id, cid))
  if (conv) {
    conv.lastMessage = previewMessage(message)
    conv.timeText = formatTime(message.createdAt || new Date().toISOString())
    if (fromPeer) conv.unreadCount = (conv.unreadCount || 0) + 1
    const idx = list.value.indexOf(conv)
    if (idx > 0) {
      list.value.splice(idx, 1)
      list.value.unshift(conv)
    }
  } else {
    loadList()
  }
}

function matchId(a, b) {
  const sa = a?._id?.toString?.() || a?.toString?.()
  const sb = b?._id?.toString?.() || b?.toString?.()
  return sa === sb
}

function openRoom(item) {
  const title = encodeURIComponent(item.peerName || '聊天')
  uni.navigateTo({ url: `/pages/chat/room?id=${item._id}&title=${title}` })
}

function toggleSearch() {
  if (!loggedIn.value) {
    promptLogin({ content: '登录后即可搜索好友' })
    return
  }
  searching.value = !searching.value
  if (!searching.value) keyword.value = ''
}

function clearKeyword() {
  keyword.value = ''
}

function hideKeyboard() {
  try {
    uni.hideKeyboard()
  } catch { /* ignore */ }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx 8rpx;
  background: #f5f7fa;
}

.toolbar-tip {
  font-size: 24rpx;
  color: #909399;
}

.toolbar-search {
  padding: 10rpx 18rpx;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.toolbar-search:active {
  opacity: 0.8;
}

.toolbar-search-icon {
  font-size: 26rpx;
  color: #409eff;
}

.search-panel {
  padding: 8rpx 24rpx 12rpx;
}

.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 0 24rpx;
  height: 72rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.search-leading {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  color: #303133;
}

.search-ph {
  color: #c0c4cc;
}

.search-clear {
  font-size: 24rpx;
  color: #909399;
  padding: 8rpx 0 8rpx 12rpx;
}

.list-body {
  padding-top: 8rpx;
}

.conv {
  display: flex;
  align-items: center;
  gap: 20rpx;
  position: relative;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #67c23a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.body {
  flex: 1;
  min-width: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
}

.name {
  font-weight: 600;
  font-size: 30rpx;
}

.preview {
  display: block;
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  background: #f56c6c;
  color: #fff;
  border-radius: 16rpx;
  font-size: 20rpx;
  padding: 0 8rpx;
}
</style>
