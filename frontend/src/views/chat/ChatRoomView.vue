<template>
  <el-card class="chat-room">
    <template #header>
      <div class="room-header">
        <el-button link @click="$router.push('/chat')">← 返回</el-button>
        <span>{{ peerName }}</span>
        <el-tag v-if="product" size="small" type="info">{{ product.title }}</el-tag>
      </div>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 12px">
      <el-button link type="primary" @click="loadMessages">重试</el-button>
    </el-alert>

    <div class="search-bar" v-if="messages.length">
      <el-input
        v-model="searchKeyword"
        size="small"
        placeholder="搜索聊天记录..."
        clearable
        :prefix-icon="Search"
        @input="onSearch"
      />
      <span v-if="searchKeyword" class="search-count">
        {{ searchResults.length }} 条匹配
        <el-button link size="small" @click="prevMatch" :disabled="!searchResults.length">↑</el-button>
        <el-button link size="small" @click="nextMatch" :disabled="!searchResults.length">↓</el-button>
      </span>
    </div>
    <div ref="msgBoxRef" class="messages" v-loading="loading">
      <div
        v-for="(msg, idx) in displayMessages"
        :key="msg._id"
        :ref="(el) => { if (el) msgRefs[msg._id] = el }"
        class="msg-row"
        :class="{ mine: isMine(msg), highlight: msg._highlight }"
      >
        <div v-if="isMine(msg)" class="bubble-wrap">
          <span v-if="msg.read" class="read-status">已读</span>
          <img
            v-if="msg.type === 'image'"
            :src="fileUrl(msg.content)"
            class="msg-img"
            loading="lazy"
            decoding="async"
            alt="聊天图片"
            @click="previewImg(msg.content)"
          />
          <div v-else class="bubble bubble-text" v-html="highlightKeyword(msg.content, searchKeyword)" />
        </div>
        <template v-else>
          <img
            v-if="msg.type === 'image'"
            :src="fileUrl(msg.content)"
            class="msg-img"
            loading="lazy"
            decoding="async"
            alt="聊天图片"
            @click="previewImg(msg.content)"
          />
          <div v-else class="bubble bubble-text" v-html="highlightKeyword(msg.content, searchKeyword)" />
        </template>
        <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
      </div>
      <el-empty v-if="!loading && searchKeyword && !displayMessages.length" description="无匹配消息" />
    </div>

    <div v-if="peerTyping" class="typing-hint">对方正在输入...</div>

    <div class="input-area">
      <el-upload
        :show-file-list="false"
        accept="image/*"
        :http-request="sendImage"
      >
        <el-button :icon="Picture">图片</el-button>
      </el-upload>
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="2"
        placeholder="输入消息..."
        @input="onInputTyping"
        @keydown.enter.exact.prevent="sendText"
      />
      <el-button type="primary" :loading="sending" @click="sendText">发送</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Picture, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as chatApi from '@/api/chat'
import * as productApi from '@/api/product'
import { compressImage } from '@/utils/imageCompress'
import { getFileUrl } from '@/utils/fileUrl'
import { highlightKeyword } from '@/utils/highlight'
import { WS_EVENTS } from '@/constants/wsEvents'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const route = useRoute()
const auth = useAuthStore()
const chatStore = useChatStore()
const loading = ref(false)
const error = ref('')
const sending = ref(false)
const messages = ref([])
const inputText = ref('')
const msgBoxRef = ref()
const peerName = ref('聊天')
const product = ref(null)
const peerTyping = ref(false)
let typingTimer = null

const searchKeyword = ref('')
const searchResults = ref([])
const searchIdx = ref(-1)
const msgRefs = {}
const displayMessages = ref([])

const fileUrl = getFileUrl

function onSearch() {
  searchResults.value = []
  searchIdx.value = -1
  if (!searchKeyword.value) {
    displayMessages.value = messages.value.map((m) => ({ ...m, _highlight: false }))
    return
  }
  const kw = searchKeyword.value.toLowerCase()
  const result = []
  displayMessages.value = messages.value.map((m) => {
    const match = m.type === 'text' && m.content?.toLowerCase().includes(kw)
    if (match) result.push(m._id)
    return { ...m, _highlight: false }
  })
  searchResults.value = result
  if (result.length) jumpToMatch(0)
}

function jumpToMatch(index) {
  searchIdx.value = index
  displayMessages.value = displayMessages.value.map((m) => ({ ...m, _highlight: false }))
  const id = searchResults.value[index]
  if (id) {
    const item = displayMessages.value.find((m) => m._id === id)
    if (item) item._highlight = true
    nextTick(() => {
      const el = msgRefs[id]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
}

function nextMatch() {
  if (!searchResults.value.length) return
  const next = (searchIdx.value + 1) % searchResults.value.length
  jumpToMatch(next)
}

function prevMatch() {
  if (!searchResults.value.length) return
  const prev = (searchIdx.value - 1 + searchResults.value.length) % searchResults.value.length
  jumpToMatch(prev)
}

const conversationId = computed(() => route.params.conversationId)

function isMine(msg) {
  const sid = msg.senderId?._id || msg.senderId
  return sid?.toString() === auth.user?._id?.toString()
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function loadMessages() {
  loading.value = true
  error.value = ''
  try {
    const res = await chatApi.getMessages(conversationId.value, { pageSize: 50 })
    messages.value = res.list
    displayMessages.value = res.list.map((m) => ({ ...m, _highlight: false }))
    await chatApi.markRead(conversationId.value)
    chatStore.fetchConversations()
    scrollBottom()
  } catch (e) {
    error.value = e.message || '加载消息失败'
  } finally {
    loading.value = false
  }
}

function scrollBottom() {
  nextTick(() => {
    if (msgBoxRef.value) msgBoxRef.value.scrollTop = msgBoxRef.value.scrollHeight
  })
}

function appendMessage(message) {
  if (messages.value.some((m) => m._id === message._id)) return
  const m = { ...message, read: message.read ?? false }
  messages.value.push(m)
  if (!searchKeyword.value) {
    displayMessages.value.push({ ...m, _highlight: false })
  }
  scrollBottom()
}

function applyReadReceipts(messageIds = []) {
  if (!messageIds?.length) return
  const idSet = new Set(messageIds.map((id) => id.toString()))
  messages.value.forEach((m) => {
    if (isMine(m) && idSet.has(m._id?.toString())) {
      m.read = true
    }
  })
}

async function sendText() {
  const text = inputText.value.trim()
  if (!text) return
  sending.value = true
  try {
    if (chatStore.ws.connected.value) {
      chatStore.ws.send(WS_EVENTS.MESSAGE_SEND, {
        conversationId: conversationId.value,
        type: 'text',
        content: text,
      })
      inputText.value = ''
    } else {
      const msg = await chatApi.sendMessage(conversationId.value, { type: 'text', content: text })
      appendMessage(msg)
      inputText.value = ''
    }
  } finally {
    sending.value = false
  }
}

async function sendImage({ file }) {
  sending.value = true
  try {
    const compressed = await compressImage(file)
    const res = await productApi.uploadImages([compressed])
    const url = res.paths?.[0] ?? res.urls[0]
    if (chatStore.ws.connected.value) {
      chatStore.ws.send(WS_EVENTS.MESSAGE_SEND, {
        conversationId: conversationId.value,
        type: 'image',
        content: url,
      })
    } else {
      const msg = await chatApi.sendMessage(conversationId.value, { type: 'image', content: url })
      appendMessage(msg)
    }
  } finally {
    sending.value = false
  }
}

function previewImg(url) {
  window.open(getFileUrl(url), '_blank')
}

function onInputTyping() {
  if (!chatStore.ws.connected.value) return
  chatStore.ws.send(WS_EVENTS.TYPING, { conversationId: conversationId.value, typing: true })
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    chatStore.ws.send(WS_EVENTS.TYPING, { conversationId: conversationId.value, typing: false })
  }, 2000)
}

let offReceive = null
let offSendOk = null
let offRead = null
let offTyping = null

onMounted(async () => {
  chatStore.initSocket()
  const convs = await chatApi.getConversations()
  const conv = convs.find((c) => c._id === conversationId.value)
  if (conv) {
    peerName.value = conv.peer?.nickname || '用户'
    product.value = conv.productId
  }
  await loadMessages()

  offReceive = chatStore.ws.on(WS_EVENTS.MESSAGE_RECEIVE, ({ message, conversationId: cid }) => {
    if (cid === conversationId.value) {
      appendMessage(message)
      if (!isMine(message)) {
        chatApi.markRead(conversationId.value).then((res) => {
          applyReadReceipts(res?.messageIds)
        })
      }
    }
  })

  offSendOk = chatStore.ws.on(WS_EVENTS.MESSAGE_SEND_OK, ({ message }) => {
    if (message) appendMessage({ ...message, read: false })
  })

  offRead = chatStore.ws.on(WS_EVENTS.MESSAGE_READ, (data) => {
    if (data.conversationId === conversationId.value) {
      applyReadReceipts(data.messageIds)
    }
  })

  offTyping = chatStore.ws.on(WS_EVENTS.TYPING, (data) => {
    if (data.conversationId === conversationId.value) {
      peerTyping.value = data.typing
    }
  })
})

onUnmounted(() => {
  offReceive?.()
  offSendOk?.()
  offRead?.()
  offTyping?.()
  clearTimeout(typingTimer)
})
</script>

<style scoped>
.chat-room {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  height: calc(100dvh - 140px);
}
.room-header { display: flex; align-items: center; gap: 12px; }
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 360px;
  max-height: 55vh;
  max-height: 55dvh;
}
.msg-row { display: flex; flex-direction: column; margin-bottom: 12px; align-items: flex-start; }
.msg-row.mine { align-items: flex-end; }
.bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  max-width: 75%;
}
.read-status {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
  padding-bottom: 6px;
  user-select: none;
}
.bubble-text {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  word-break: break-word;
}
.msg-row.mine .bubble-text { background: #409eff; color: #fff; }
.msg-time { font-size: 11px; color: var(--app-muted); margin-top: 4px; }
.msg-img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  display: block;
  object-fit: cover;
}
.search-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.search-count { font-size: 12px; color: var(--app-muted); white-space: nowrap; }
.msg-row.highlight .bubble-text { outline: 2px solid #e6a23c; border-radius: 12px; }
.input-area {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
}
.input-area .el-textarea { flex: 1; }
</style>
