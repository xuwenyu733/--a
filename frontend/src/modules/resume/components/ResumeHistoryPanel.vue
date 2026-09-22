<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useResumeStore } from '../stores/resumeStore'
import { getTemplateById } from '../constants/resumeTemplates'

const store = useResumeStore()
const loading = ref(false)

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function templateLabel(item) {
  const id = item.builderData?.template
  if (!id) return ''
  return getTemplateById(id).name
}

async function refresh() {
  loading.value = true
  try {
    await store.fetchHistory()
  } finally {
    loading.value = false
  }
}

async function onLoad(item) {
  try {
    await store.loadFromHistory(item._id)
    ElMessage.success('已恢复该记录')
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  }
}

async function onDelete(item) {
  try {
    await ElMessageBox.confirm(`删除「${item.fileName || '未命名'}」？`, '确认', { type: 'warning' })
    await store.removeHistory(item._id)
    ElMessage.success('已删除')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

onMounted(refresh)
</script>

<template>
  <el-card class="history-card" shadow="hover">
    <template #header>
      <div class="history-header">
        <span>云端记录</span>
        <el-button link type="primary" :loading="loading" @click="refresh">刷新</el-button>
      </div>
    </template>

    <el-empty v-if="!store.historyList.length && !loading" description="生成完成后自动保存" :image-size="64" />

    <ul v-else class="history-list">
      <li
        v-for="item in store.historyList"
        :key="item._id"
        :class="{ active: store.currentRecordId === item._id }"
      >
        <div class="info" @click="onLoad(item)">
          <div class="title-row">
            <strong>{{ item.fileName || '未命名简历' }}</strong>
            <el-tag size="small" type="success">创作</el-tag>
          </div>
          <span class="meta">
            {{ formatTime(item.updatedAt) }} · {{ item.style }}
            <template v-if="templateLabel(item)"> · {{ templateLabel(item) }}</template>
          </span>
        </div>
        <el-button type="danger" link @click.stop="onDelete(item)">删除</el-button>
      </li>
    </ul>

    <p class="hint">
      登录后最多保留 50 条；超出时自动淘汰最旧记录，并清理不再引用的证件照。生成成功将自动同步。
    </p>
  </el-card>
</template>

<style scoped>
.history-card {
  border-radius: 12px;
  margin-top: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 280px;
  overflow-y: auto;
}

.history-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--app-border);
  border-radius: 6px;
}

.history-list li.active {
  background: var(--app-border);
}

.history-list .info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.history-list strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.title-row strong {
  flex: 1;
  min-width: 0;
}

.meta {
  font-size: 12px;
  color: var(--app-muted);
}

.hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--app-muted);
  line-height: 1.4;
}
</style>
