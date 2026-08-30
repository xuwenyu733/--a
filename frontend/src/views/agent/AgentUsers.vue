<template>
  <el-card>
    <template #header>本区域用户</template>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="phone" label="手机号" />
      <el-table-column label="角色">
        <template #default="{ row }">{{ ROLE_LABELS[row.role] }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button v-if="row.status === 'active'" size="small" type="danger" @click="ban(row)">封禁</el-button>
          <el-button v-else size="small" type="success" @click="unban(row)">解封</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as agentApi from '@/api/agent'
import { ROLE_LABELS } from '@/constants/roles'

const list = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await agentApi.getAgentUsers({})
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载用户列表失败'
  } finally {
    loading.value = false
  }
}

async function ban(row) {
  await agentApi.updateUserStatus(row._id, { status: 'banned' })
  ElMessage.success('已封禁')
  load()
}

async function unban(row) {
  await agentApi.updateUserStatus(row._id, { status: 'active' })
  ElMessage.success('已解封')
  load()
}

onMounted(load)
</script>
