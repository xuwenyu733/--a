<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header-row">
        <span>区域管理</span>
        <el-button type="primary" @click="showCreate = true">新增区域</el-button>
      </div>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-empty v-if="!loading && !error && !regions.length" description="暂无区域" />

    <el-table v-else :data="regions">
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="city" label="城市" />
      <el-table-column label="代理">
        <template #default="{ row }">{{ row.agentId?.nickname || '未分配' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" />
    </el-table>
    <el-dialog v-model="showCreate" title="新增区域" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="编码"><el-input v-model="form.code" /></el-form-item>
        <el-form-item label="省份"><el-input v-model="form.province" /></el-form-item>
        <el-form-item label="城市"><el-input v-model="form.city" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="create">创建</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as adminApi from '@/api/admin'

const regions = ref([])
const loading = ref(true)
const error = ref('')
const showCreate = ref(false)
const form = ref({ name: '', code: '', province: '', city: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    regions.value = await adminApi.getRegions()
  } catch (e) {
    error.value = e.message || '加载区域失败'
  } finally {
    loading.value = false
  }
}

async function create() {
  await adminApi.createRegion(form.value)
  ElMessage.success('创建成功')
  showCreate.value = false
  load()
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
</style>
