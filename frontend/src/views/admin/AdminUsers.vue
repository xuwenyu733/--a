<template>
  <el-card header="全平台用户">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="phone" label="手机号" />
      <el-table-column label="角色">
        <template #default="{ row }">{{ ROLE_LABELS[row.role] }}</template>
      </el-table-column>
      <el-table-column label="区域">
        <template #default="{ row }">{{ row.regionId?.name || '全局' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" />
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as adminApi from '@/api/admin'
import { ROLE_LABELS } from '@/constants/roles'

const list = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminApi.getAdminUsers({})
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载用户列表失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
