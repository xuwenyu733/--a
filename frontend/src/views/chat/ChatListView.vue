<template>
  <el-card>
    <template #header>消息</template>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <div v-loading="loading" class="chat-list">
      <div
        v-for="item in list"
        :key="item._id"
        class="chat-item"
        @click="$router.push(`/chat/${item._id}`)"
      >
        <el-avatar :size="48" :src="peerAvatar(item)">{{ item.peer?.nickname?.[0] }}</el-avatar>
        <div class="body">
          <div class="top">
            <span class="name">{{ item.peer?.nickname }}</span>
            <span class="time">{{ formatTime(item.lastMessage?.createdAt || item.updatedAt) }}</span>
          </div>
          <div class="bottom">
            <span class="preview">{{ previewText(item) }}</span>
            <el-badge v-if="item.unreadCount" :value="item.unreadCount" class="badge" />
          </div>
          <div v-if="item.productId" class="product-tag">
            <el-tag size="small" type="info">关于：{{ item.productId?.title }}</el-tag>
          </div>
        </div>
      </div>
      <el-empty v-if="!loading && !error && !list.length" description="暂无消息，去商品页联系卖家吧" />
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as chatApi from '@/api/chat'
import { useChatStore } from '@/stores/chat'
import { getFileUrl } from '@/utils/fileUrl'

const chatStore = useChatStore()
const loading = ref(false)
const error = ref('')
const list = ref([])

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function peerAvatar(item) {
  return getFileUrl(item.peer?.avatar)
}

function previewText(item) {
  const lm = item.lastMessage
  if (!lm) return '暂无消息'
  if (lm.type === 'image') return '[图片]'
  if (lm.type === 'system') return lm.content || '[系统消息]'
  return lm.content || '暂无消息'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    chatStore.initSocket()
    list.value = await chatApi.getConversations()
    chatStore.conversations = list.value
    chatStore.totalUnread = list.value.reduce((s, c) => s + (c.unreadCount || 0), 0)
  } catch (e) {
    error.value = e.message || '加载消息列表失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.chat-list { min-height: 200px; }
.chat-item {
  display: flex;
  gap: 12px;
  padding: 14px 8px;
  border-bottom: 1px solid var(--app-border);
  cursor: pointer;
  transition: background 0.2s;
}
.chat-item:hover { background: var(--app-border); }
.body { flex: 1; min-width: 0; }
.top { display: flex; justify-content: space-between; }
.name { font-weight: 600; }
.time { font-size: 12px; color: var(--app-muted); }
.bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.preview { color: var(--app-muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.product-tag { margin-top: 4px; }
</style>
