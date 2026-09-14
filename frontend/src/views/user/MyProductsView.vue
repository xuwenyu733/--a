<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>我的发布</span>
        <el-button type="primary" @click="$router.push('/products/new')">发布闲置</el-button>
      </div>
    </template>
    <el-tabs v-model="statusTab" @tab-change="load">
      <el-tab-pane label="在售" name="on_sale" />
      <el-tab-pane label="已售出" name="sold" />
      <el-tab-pane label="已下架" name="off_shelf" />
    </el-tabs>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="title" label="标题" min-width="160" />
      <el-table-column label="价格" width="120">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column label="库存" width="100">
        <template #default="{ row }">{{ row.stock ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ STATUS_LABELS[row.status] }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button size="small" @click="$router.push(`/products/${row._id}`)">查看</el-button>
          <el-button v-if="row.status === 'on_sale'" size="small" @click="$router.push(`/products/${row._id}/edit`)">编辑</el-button>
          <el-button v-if="row.status === 'on_sale'" size="small" type="success" @click="setStatus(row, 'sold')">标记已售</el-button>
          <el-button v-if="row.status === 'on_sale'" size="small" @click="setStatus(row, 'off_shelf')">下架</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !error && !list.length" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as productApi from '@/api/product'
import { STATUS_LABELS } from '@/constants/product'

const loading = ref(false)
const error = ref('')
const list = ref([])
const statusTab = ref('on_sale')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await productApi.getMyProducts({ status: statusTab.value })
    list.value = res.list
  } catch (e) {
    error.value = e.message || '加载商品列表失败'
  } finally {
    loading.value = false
  }
}

async function setStatus(row, status) {
  await productApi.updateProductStatus(row._id, status)
  ElMessage.success('已更新')
  load()
}

async function remove(row) {
  await ElMessageBox.confirm('确定删除该商品？', '提示', { type: 'warning' })
  await productApi.deleteProduct(row._id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
</style>
