<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header-row">
        <span>区域代理管理</span>
        <el-button type="primary" @click="showCreate = true">创建代理</el-button>
      </div>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-empty v-if="!loading && !error && !agents.length" description="暂无代理" />

    <el-table v-else :data="agents">
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="phone" label="手机号" />
      <el-table-column label="负责区域">
        <template #default="{ row }">{{ row.regionId?.name || '-' }}</template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="showCreate" title="创建区域代理" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="绑定区域">
          <el-select v-model="form.regionId" style="width:100%">
            <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
          </el-select>
        </el-form-item>
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

const agents = ref([])
const regions = ref([])
const loading = ref(true)
const error = ref('')
const showCreate = ref(false)
const form = ref({ phone: '', password: '', nickname: '', regionId: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[agents.value, regions.value] = await Promise.all([
      adminApi.getAgents(),
      adminApi.getRegions(),
    ])
  } catch (e) {
    error.value = e.message || '加载代理列表失败'
  } finally {
    loading.value = false
  }
}

async function create() {
  await adminApi.createAgent(form.value)
  ElMessage.success('代理创建成功')
  showCreate.value = false
  load()
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
</style>
