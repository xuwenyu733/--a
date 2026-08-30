<template>
  <el-card>
    <template #header>{{ type === 'student' ? '学生认证审核' : '商家入驻审核' }}</template>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-table :data="list" v-loading="loading">
      <el-table-column label="用户" width="140">
        <template #default="{ row }">{{ row.userId?.nickname }} ({{ row.userId?.phone }})</template>
      </el-table-column>
      <el-table-column label="申请信息" min-width="200">
        <template #default="{ row }">
          <pre class="payload">{{ JSON.stringify(row.payload, null, 2) }}</pre>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag>{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="180" v-if="showActions">
        <template #default="{ row }">
          <el-button size="small" type="success" @click="review(row._id, 'approved')">通过</el-button>
          <el-button size="small" type="danger" @click="openReject(row)">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="rejectVisible" title="拒绝原因" width="400px">
      <el-input v-model="rejectReason" type="textarea" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as agentApi from '@/api/agent'

const route = useRoute()
const type = computed(() => route.meta.verifyType || 'student')
const list = ref([])
const loading = ref(false)
const error = ref('')
const rejectVisible = ref(false)
const rejectReason = ref('')
const currentId = ref('')
const showActions = ref(true)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await agentApi.getAgentVerifications({ type: type.value, status: 'pending' })
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载审核列表失败'
  } finally {
    loading.value = false
  }
}

async function review(id, status) {
  await agentApi.reviewVerification(id, { status })
  ElMessage.success('操作成功')
  load()
}

function openReject(row) {
  currentId.value = row._id
  rejectReason.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  await agentApi.reviewVerification(currentId.value, { status: 'rejected', rejectReason: rejectReason.value })
  rejectVisible.value = false
  ElMessage.success('已拒绝')
  load()
}

onMounted(load)
</script>

<style scoped>
.payload { font-size: 12px; white-space: pre-wrap; margin: 0; }
</style>
