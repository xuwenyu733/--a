<template>
  <el-card :header="title">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-form :inline="true" class="filters" @submit.prevent="search">
      <el-form-item v-if="showRegion" label="区域">
        <el-select v-model="filters.regionId" clearable placeholder="全部区域" style="width:160px">
          <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width:120px">
          <el-option v-for="(label, key) in ORDER_STATUS_LABELS" :key="key" :label="label" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item label="显示">
        <el-select v-model="filters.deleted" style="width:130px">
          <el-option label="正常订单" value="" />
          <el-option label="已删除" value="only" />
          <el-option label="全部" value="all" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading">
      <el-table-column label="商品" min-width="140">
        <template #default="{ row }">{{ row.productId?.title }}</template>
      </el-table-column>
      <el-table-column v-if="showRegion" label="区域" width="100">
        <template #default="{ row }">{{ row.regionId?.name }}</template>
      </el-table-column>
      <el-table-column label="买家" width="100">
        <template #default="{ row }">{{ row.buyerId?.nickname }}</template>
      </el-table-column>
      <el-table-column label="卖家" width="100">
        <template #default="{ row }">{{ row.sellerId?.nickname }}</template>
      </el-table-column>
      <el-table-column label="金额" width="80">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="ORDER_STATUS_TYPE[row.status]">{{ ORDER_STATUS_LABELS[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="删除" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.deletedAt" type="info" size="small">已删</el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.deletedAt"
            size="small"
            type="success"
            @click="restore(row)"
          >恢复</el-button>
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
import request from '@/utils/request'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TYPE } from '@/constants/order'

const props = defineProps({
  title: { type: String, default: '订单管理' },
  listPath: { type: String, required: true },
  restorePath: { type: String, required: true },
  showRegion: { type: Boolean, default: false },
  regionsLoader: { type: Function, default: null },
})

const loading = ref(false)
const error = ref('')
const list = ref([])
const regions = ref([])
const page = ref(1)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const filters = ref({ regionId: '', status: '', deleted: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { page: page.value, pageSize: 20 }
    if (filters.value.regionId) params.regionId = filters.value.regionId
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.deleted) params.deleted = filters.value.deleted
    const res = await request.get(props.listPath, { params })
    list.value = res.list
    pagination.value = res.pagination
  } catch (e) {
    error.value = e.message || '加载订单失败'
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

async function restore(row) {
  await ElMessageBox.confirm('确定恢复该订单？用户端将重新可见。', '恢复订单', { type: 'info' })
  await request.post(props.restorePath.replace(':id', row._id))
  ElMessage.success('已恢复')
  load()
}

onMounted(async () => {
  if (props.showRegion && props.regionsLoader) {
    try {
      regions.value = await props.regionsLoader()
    } catch (e) {
      console.warn('load regions failed', e)
    }
  }
  load()
})
</script>

<style scoped>
.filters { margin-bottom: 12px; }
</style>
