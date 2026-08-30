<template>
  <el-card header="举报处理">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-tabs v-model="status" @tab-change="load">
      <el-tab-pane label="待处理" name="pending" />
      <el-tab-pane label="已处理" name="resolved" />
      <el-tab-pane label="已驳回" name="rejected" />
    </el-tabs>
    <el-table :data="list" v-loading="loading">
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ row.targetType === 'product' ? '商品' : '用户' }}</template>
      </el-table-column>
      <el-table-column label="原因" width="120">
        <template #default="{ row }">{{ reasonLabels[row.reason] || row.reason }}</template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="120" show-overflow-tooltip />
      <el-table-column label="举报人" width="100">
        <template #default="{ row }">{{ row.reporterId?.nickname }}</template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column v-if="status === 'pending'" label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="success" @click="openHandle(row, 'resolved')">成立</el-button>
          <el-button size="small" @click="openHandle(row, 'rejected')">驳回</el-button>
        </template>
      </el-table-column>
      <el-table-column v-else label="处理备注" min-width="120">
        <template #default="{ row }">{{ row.handleNote || '—' }}</template>
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

    <el-dialog v-model="handleVisible" title="处理举报" width="400px">
      <p>处理方式：<strong>{{ handleStatus === 'resolved' ? '举报成立' : '驳回举报' }}</strong></p>
      <p v-if="handleStatus === 'resolved'" class="tip">成立后将自动下架商品或封禁用户</p>
      <el-input v-model="handleNote" type="textarea" :rows="3" placeholder="处理备注（选填）" style="margin-top:12px" />
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="handling" @click="confirmHandle">确认</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as reportApi from '@/api/report'

const loading = ref(false)
const error = ref('')
const list = ref([])
const status = ref('pending')
const page = ref(1)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const reasonLabels = ref({})
const handleVisible = ref(false)
const handleStatus = ref('')
const handleNote = ref('')
const currentRow = ref(null)
const handling = ref(false)

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await reportApi.getReports({ status: status.value, page: page.value })
    list.value = res.list
    pagination.value = res.pagination
    reasonLabels.value = res.reasonLabels || {}
  } catch (e) {
    error.value = e.message || '加载举报列表失败'
  } finally {
    loading.value = false
  }
}

function openHandle(row, st) {
  currentRow.value = row
  handleStatus.value = st
  handleNote.value = ''
  handleVisible.value = true
}

async function confirmHandle() {
  handling.value = true
  try {
    await reportApi.handleReport(currentRow.value._id, {
      status: handleStatus.value,
      handleNote: handleNote.value,
    })
    ElMessage.success('处理完成')
    handleVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message || '处理失败')
  } finally {
    handling.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.tip { color: #e6a23c; font-size: 13px; margin-top: 8px; }
</style>
