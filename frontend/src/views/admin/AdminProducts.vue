<template>
  <el-card header="全平台商品管理">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-form :inline="true" class="filters" @submit.prevent="search">
      <el-form-item label="区域">
        <el-select v-model="filters.regionId" clearable placeholder="全部区域" style="width:160px">
          <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width:120px">
          <el-option v-for="(label, key) in STATUS_LABELS" :key="key" :label="label" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input v-model="filters.keyword" clearable placeholder="搜索标题" style="width:160px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading">
      <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
      <el-table-column label="区域" width="110">
        <template #default="{ row }">{{ row.regionId?.name }}</template>
      </el-table-column>
      <el-table-column label="卖家" width="100">
        <template #default="{ row }">{{ row.sellerId?.nickname }}</template>
      </el-table-column>
      <el-table-column label="价格" width="80">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column label="库存" width="80">
        <template #default="{ row }">{{ row.stock ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ STATUS_LABELS[row.status] }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" link @click="$router.push(`/products/${row._id}`)">查看</el-button>
          <el-button v-if="row.status === 'on_sale'" size="small" type="danger" @click="offShelf(row)">下架</el-button>
          <el-button v-if="row.status === 'off_shelf'" size="small" type="success" @click="restore(row)">恢复</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="pagination.total > pagination.pageSize"
      style="margin-top:16px"
      layout="prev, pager, next, total"
      :total="pagination.total"
      :page-size="pagination.pageSize"
      v-model:current-page="page"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as adminApi from '@/api/admin'
import { STATUS_LABELS } from '@/constants/product'

const loading = ref(false)
const error = ref('')
const list = ref([])
const regions = ref([])
const page = ref(1)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const filters = ref({ regionId: '', status: '', keyword: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { page: page.value, pageSize: 20 }
    if (filters.value.regionId) params.regionId = filters.value.regionId
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.keyword) params.keyword = filters.value.keyword
    const res = await adminApi.getAdminProducts(params)
    list.value = res.list
    pagination.value = res.pagination
  } catch (e) {
    error.value = e.message || '加载商品列表失败'
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

async function offShelf(row) {
  await ElMessageBox.confirm(`确定下架「${row.title}」？`, '提示', { type: 'warning' })
  await adminApi.adminModerateProduct(row._id, 'off_shelf')
  ElMessage.success('已下架')
  load()
}

async function restore(row) {
  await adminApi.adminModerateProduct(row._id, 'on_sale')
  ElMessage.success('已恢复上架')
  load()
}

onMounted(async () => {
  try {
    regions.value = await adminApi.getRegions()
  } catch (e) {
    console.warn('load regions failed', e)
  }
  load()
})
</script>

<style scoped>
.filters { margin-bottom: 16px; }
</style>
