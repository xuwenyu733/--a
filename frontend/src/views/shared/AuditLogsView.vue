<template>
  <el-card header="操作日志">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-table :data="list" v-loading="loading">
      <el-table-column label="操作人" width="120">
        <template #default="{ row }">{{ row.operatorId?.nickname }}</template>
      </el-table-column>
      <el-table-column label="角色" width="100">
        <template #default="{ row }">{{ roleLabels[row.operatorRole] || row.operatorRole }}</template>
      </el-table-column>
      <el-table-column label="动作" width="120">
        <template #default="{ row }">{{ actionLabels[row.action] || row.action }}</template>
      </el-table-column>
      <el-table-column label="对象" width="100" prop="targetType" />
      <el-table-column label="详情" min-width="160">
        <template #default="{ row }">{{ formatDetail(row) }}</template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="pagination.total > pagination.pageSize"
      style="margin-top:16px"
      layout="prev, pager, next"
      :total="pagination.total"
      :page-size="pagination.pageSize"
      v-model:current-page="page"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { AUDIT_ACTION_LABELS } from '@/constants/audit'
import { ROLE_LABELS } from '@/constants/roles'

const props = defineProps({
  apiPath: { type: String, required: true },
})

const loading = ref(false)
const error = ref('')
const list = ref([])
const page = ref(1)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const actionLabels = AUDIT_ACTION_LABELS
const roleLabels = ROLE_LABELS

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN') : ''
}

function formatDetail(row) {
  const d = row.detail
  if (!d || !Object.keys(d).length) return '—'
  return JSON.stringify(d)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await request.get(props.apiPath, { params: { page: page.value } })
    list.value = res.list
    pagination.value = res.pagination
  } catch (e) {
    error.value = e.message || '加载日志失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
