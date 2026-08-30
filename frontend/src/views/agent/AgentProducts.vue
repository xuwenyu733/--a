<template>
  <el-card header="本区域商品管理">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="title" label="标题" min-width="140" />
      <el-table-column label="卖家" width="120">
        <template #default="{ row }">{{ row.sellerId?.nickname }}</template>
      </el-table-column>
      <el-table-column label="价格" width="80">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ STATUS_LABELS[row.status] }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button v-if="row.status === 'on_sale'" size="small" type="danger" @click="offShelf(row)">强制下架</el-button>
          <el-button v-if="row.status === 'off_shelf'" size="small" @click="restore(row)">恢复上架</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { STATUS_LABELS } from '@/constants/product'

const loading = ref(false)
const error = ref('')
const list = ref([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await request.get('/agent/products', { params: {} })
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载商品列表失败'
  } finally {
    loading.value = false
  }
}

async function offShelf(row) {
  await ElMessageBox.confirm('确定强制下架该商品？', '提示', { type: 'warning' })
  await request.patch(`/agent/products/${row._id}/status`, { status: 'off_shelf' })
  ElMessage.success('已下架')
  load()
}

async function restore(row) {
  await request.patch(`/agent/products/${row._id}/status`, { status: 'on_sale' })
  ElMessage.success('已恢复')
  load()
}

onMounted(load)
</script>
