<template>
  <view class="room">
    <view v-if="loadError" class="error-bar">
      <text>{{ loadError }}</text>
      <text class="retry" @tap="loadMessages">重试</text>
    </view>
    <view v-if="productTitle" class="product-bar muted">关于：{{ productTitle }}</view>
    <scroll-view scroll-y class="messages" :scroll-into-view="scrollInto" @scrolltoupper="loadMore">
      <view v-if="loadingMore" class="load-more-top">加载中…</view>
      <view v-if="!hasMore && messages.length" class="load-more-top muted">没有更多消息</view>
      <view v-for="msg in messages" :key="msg._id" :id="'msg-' + msg._id" class="msg" :class="{ mine: msg.mine }">
        <image v-if="msg.type === 'image' && msg.imageUrl" class="img-bubble" :src="msg.imageUrl" mode="widthFix" lazy-load @tap="previewImage(msg.imageUrl)" />
        <text v-else class="bubble">{{ msg.displayContent }}</text>
        <text class="time muted">{{ msg.timeText }}</text>
      </view>
    </scroll-view>
    <view class="input-bar">
      <button size="mini" class="img-btn" :disabled="sending" @tap="pickImage">图片</button>
      <input class="input" placeholder="输入消息" v-model="text" confirm-type="send" @confirm="send" />
      <button size="mini" type="primary" :loading="sending" @tap="send">发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMessages, sendMessage, markRead, getConversation } from '@/api/chat'
import { getUser } from '@/utils/auth'
import { getFileUrl } from '@/utils/fileUrl'
import { uploadProductImage } from '@/utils/upload'
import { onWs, offWs } from '@/utils/ws'
import { WS_EVENTS } from '@/utils/wsEvents'
import { formatTime, previewMessage } from '@/utils/format'
import { refreshChatUnread } from '@/utils/unread'

const messages = ref([])
const text = ref('')
const loadError = ref('')
const scrollInto = ref('')
const productTitle = ref('')
const sending = ref(false)
let convId = ''
let userId = ''
let onReceive = null
let hasMore = false
let pageNum = 1
let loadingMore = false

onLoad((options) => {
  convId = options.id
  userId = getUser()?._id
  if (options.title) {
    uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
  }
  loadMeta()
  loadMessages(true)
  onReceive = (payload) => {
    const cid = payload.conversationId?._id || payload.conversationId
    if (cid !== convId && cid?.toString?.() !== convId) return
    const msg = payload.message || payload
    appendMessage(msg, false)
    if (!isMine(msg)) markReadConv()
  }
  onWs(WS_EVENTS.MESSAGE_RECEIVE, onReceive)
})

onShow(() => {
  markReadConv()
})

onUnmounted(() => {
  if (onReceive) {
    offWs(WS_EVENTS.MESSAGE_RECEIVE, onReceive)
    onReceive = null
  }
})

async function loadMeta() {
  try {
    const conv = await getConversation(convId)
    productTitle.value = conv?.productId?.title || conv?.product?.title || ''
    if (!productTitle.value && conv?.peer?.nickname) {
      uni.setNavigationBarTitle({ title: conv.peer.nickname })
    }
  } catch { /* ignore */ }
}

async function loadMessages(reset) {
  loadError.value = ''
  if (reset) {
    pageNum = 1
    hasMore = true
  }
  try {
    const pageSize = 30
    const res = await getMessages(convId, { pageSize, page: reset ? 1 : pageNum + 1 })
    const list = (res.list || res || []).map(normalize).reverse()
    if (reset) {
      messages.value = list
    } else {
      messages.value = [...list, ...messages.value]
    }
    hasMore = list.length >= pageSize
    if (!reset) pageNum += 1
    if (reset) scrollBottom()
  } catch (e) {
    loadError.value = e.message || '加载失败'
  }
}

async function loadMore() {
  if (!hasMore || loadingMore) return
  loadingMore = true
  try {
    const prevLen = messages.value.length
    await loadMessages(false)
    const newLen = messages.value.length
    if (newLen > prevLen) {
      const firstNew = messages.value[0]
      if (firstNew) scrollInto.value = `msg-${firstNew._id}`
    }
  } finally {
    loadingMore = false
  }
}

function isMine(m) {
  const senderId = m.senderId?._id || m.senderId
  return (senderId?.toString?.() || senderId) === (userId?.toString?.() || userId)
}

function normalize(m) {
  const imageUrl = m.type === 'image' ? getFileUrl(m.content || m.image) : ''
  return {
    ...m,
    mine: isMine(m),
    timeText: formatTime(m.createdAt),
    imageUrl,
    displayContent: m.type === 'image' ? '[图片]' : (m.content || previewMessage(m)),
  }
}

function appendMessage(m, mine) {
  const exists = messages.value.some((x) => x._id === m._id)
  if (exists) return
  messages.value.push(normalize({ ...m, senderId: mine ? userId : m.senderId }))
  scrollBottom()
}

function scrollBottom() {
  const last = messages.value[messages.value.length - 1]
  if (last) {
    scrollInto.value = ''
    // nextTick toggles the value making scroll-into-view re-trigger
    setTimeout(() => { scrollInto.value = `msg-${last._id}` }, 0)
  }
}

function previewImage(url) {
  const urls = messages.value.filter((m) => m.imageUrl).map((m) => m.imageUrl)
  uni.previewImage({ current: url, urls })
}

function markReadConv() {
  markRead(convId)
    .then(() => refreshChatUnread())
    .catch((err) => console.warn('markRead failed', err))
}

async function send() {
  const content = text.value.trim()
  if (!content || sending.value) return
  text.value = ''
  sending.value = true
  try {
    const msg = await sendMessage(convId, { content, type: 'text' })
    appendMessage(msg, true)
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
    text.value = content
  } finally {
    sending.value = false
  }
}

function pickImage() {
  if (sending.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => sendImage(res.tempFilePaths[0]),
  })
}

async function sendImage(filePath) {
  sending.value = true
  // Show local preview immediately
  const tempId = `temp-${Date.now()}`
  const tempMsg = { _id: tempId, type: 'image', content: filePath, imageUrl: filePath, mine: true, timeText: '发送中…', displayContent: '[图片]' }
  messages.value.push(tempMsg)
  scrollBottom()
  try {
    const res = await uploadProductImage(filePath)
    const url = res.paths?.[0] ?? res.urls?.[0]
    if (!url) throw new Error('上传失败')
    const msg = await sendMessage(convId, { type: 'image', content: url })
    // Replace temp message with real one
    const idx = messages.value.findIndex((m) => m._id === tempId)
    if (idx >= 0) messages.value.splice(idx, 1)
    appendMessage(msg, true)
  } catch (e) {
    const idx = messages.value.findIndex((m) => m._id === tempId)
    if (idx >= 0) {
      messages.value[idx].timeText = '发送失败'
      messages.value[idx].displayContent = '[图片发送失败]'
    }
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}
</script>

<style lang="scss" scoped>
.room { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: #f5f7fa; }
.product-bar {
  padding: 12rpx 24rpx; background: #ecf5ff; font-size: 24rpx;
  border-bottom: 1rpx solid #d9ecff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.error-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 16rpx;
  padding: 16rpx 24rpx; background: #fef0f0; color: #f56c6c; font-size: 24rpx;
  border-bottom: 1rpx solid #fde2e2;
}
.error-bar .retry { color: #409eff; flex-shrink: 0; }
.load-more-top {
  text-align: center;
  padding: 16rpx 0;
  font-size: 22rpx;
  color: #909399;
}
.messages {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}
.msg { margin-bottom: 24rpx; display: flex; flex-direction: column; align-items: flex-start; }
.msg.mine { align-items: flex-end; }
.bubble { max-width: 70%; background: #fff; padding: 16rpx 20rpx; border-radius: 16rpx; line-height: 1.5; font-size: 28rpx; }
.msg.mine .bubble { background: #409eff; color: #fff; }
.img-bubble { max-width: 60%; border-radius: 12rpx; }
.time { font-size: 20rpx; margin-top: 6rpx; }
.input-bar {
  display: flex; gap: 12rpx; align-items: center;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #ebeef5;
}
.img-btn { flex-shrink: 0; }
.input {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 20rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
</style>
