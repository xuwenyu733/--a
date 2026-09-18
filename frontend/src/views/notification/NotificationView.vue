<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>通知中心</span>
        <el-button v-if="notifyStore.unreadCount" link type="primary" @click="markAll">全部已读</el-button>
      </div>
    </template>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <div v-loading="loading" class="notify-body">
      <el-timeline v-if="list.length">
        <el-timeline-item
          v-for="n in list"
          :key="n._id"
          :type="n.read ? 'info' : 'primary'"
        >
          <div class="notify-item" :class="{ clickable: canNavigate(n) }" @click="onNotifyClick(n)">
            <p class="title">{{ n.title }}</p>
            <p class="content">{{ n.content }}</p>
            <span class="time">{{ formatTime(n.createdAt) }}</span>
            <el-button v-if="canNavigate(n)" link type="primary" size="small" class="goto">查看详情</el-button>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else-if="!loading && !error && !list.length" description="暂无通知" />
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as notificationApi from '@/api/notification'
import { useNotificationStore } from '@/stores/notification'

const router = useRouter()

const notifyStore = useNotificationStore()
const loading = ref(false)
const error = ref('')
const list = ref([])

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN') : ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await notificationApi.getNotifications({ pageSize: 50 })
    list.value = res.list || []
    notifyStore.setUnread(res.unreadCount || 0)
  } catch (e) {
    error.value = e.message || '加载通知失败'
  } finally {
    loading.value = false
  }
}

function canNavigate(n) {
  if (!n.relatedId) return false
  return ['delivery', 'price_drop', 'order_status', 'new_order', 'trade_review', 'order_payment', 'refund'].includes(n.type)
}

function navigatePath(n) {
  switch (n.type) {
    case 'delivery':
      return { path: '/delivery/orders', query: { role: 'poster' } }
    case 'price_drop':
      return { path: `/products/${n.relatedId}` }
    case 'order_status':
    case 'new_order':
    case 'trade_review':
    case 'order_payment':
    case 'refund':
      return { path: '/user/orders' }
    default:
      return null
  }
}

async function onNotifyClick(n) {
  const target = navigatePath(n)
  if (!target) return
  if (!n.read) {
    try {
      await notificationApi.markNotificationRead(n._id)
      n.read = true
      notifyStore.fetchUnread()
    } catch {
      /* ignore */
    }
  }
  router.push(target)
}

async function markAll() {
  await notifyStore.markAllRead()
  list.value = list.value.map((n) => ({ ...n, read: true }))
  ElMessage.success('已全部标记已读')
}

onMounted(async () => {
  await load()
  if (notifyStore.unreadCount > 0) {
    await notifyStore.markAllRead()
    list.value = list.value.map((n) => ({ ...n, read: true }))
  }
})
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
.notify-body { min-height: 120px; }
.notify-item { padding: 2px 0; }
.title { font-weight: 600; margin: 0 0 4px; }
.content { color: #606266; margin: 0 0 4px; }
.time { font-size: 12px; color: #909399; }
.notify-item.clickable { cursor: pointer; }
.notify-item.clickable:hover .title { color: var(--el-color-primary); }
.goto { margin-top: 4px; padding: 0; }
</style>
