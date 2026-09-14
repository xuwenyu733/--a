<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>商品管理</span>
        <el-button type="primary" @click="$router.push('/merchant/products/new')">发布商品</el-button>
      </div>
    </template>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="title" label="标题" />
      <el-table-column label="价格" width="120">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column label="库存" width="100">
        <template #default="{ row }">{{ row.stock ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ STATUS_LABELS[row.status] }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template #default="{ row }">
          <el-button size="small" @click="$router.push(`/products/${row._id}`)">查看</el-button>
          <el-button v-if="row.status === 'on_sale'" size="small" @click="$router.push(`/merchant/products/${row._id}/edit`)">编辑</el-button>
          <el-button v-if="row.status === 'on_sale'" size="small" @click="setStatus(row, 'off_shelf')">下架</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as productApi from '@/api/product'
import { STATUS_LABELS } from '@/constants/product'

const loading = ref(false)
const error = ref('')
const list = ref([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await productApi.getMyProducts({})
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载商品列表失败'
  } finally {
    loading.value = false
  }
}

async function setStatus(row, status) {
  await productApi.updateProductStatus(row._id, status)
  ElMessage.success('已下架')
  load()
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
</style>
