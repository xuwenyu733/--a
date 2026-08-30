<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>{{ title }}</span>
        <div class="filters">
          <el-select
            v-if="showRegionFilter"
            v-model="filterRegionId"
            placeholder="选择校区"
            clearable
            style="width:180px"
            @change="load"
          >
            <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="状态" clearable style="width:120px" @change="load">
            <el-option v-for="(label, key) in DELIVERY_ORDER_STATUS" :key="key" :label="label" :value="key" />
          </el-select>
          <el-select v-model="filterType" placeholder="类型" clearable style="width:120px" @change="load">
            <el-option v-for="t in DELIVERY_ORDER_TYPES" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
          <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-empty v-if="!loading && !error && !list.length" :description="emptyHint" />

    <el-table v-else :data="list" v-loading="loading" stripe>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="区域" width="110">
        <template #default="{ row }">{{ row.zoneId?.name }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTag(row.status)">{{ DELIVERY_ORDER_STATUS[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="fee" label="酬劳" width="70">
        <template #default="{ row }">¥{{ row.fee }}</template>
      </el-table-column>
      <el-table-column label="取件" min-width="140" show-overflow-tooltip prop="pickupAddress" />
      <el-table-column label="送达" min-width="140" show-overflow-tooltip prop="dropoffAddress" />
      <el-table-column label="发布人" width="120">
        <template #default="{ row }">{{ row.posterId?.nickname || row.posterId?.phone }}</template>
      </el-table-column>
      <el-table-column label="骑手" width="120">
        <template #default="{ row }">{{ row.courierId?.nickname || row.courierId?.phone || '—' }}</template>
      </el-table-column>
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import * as agentApi from '@/api/agent'
import * as adminApi from '@/api/admin'
import { DELIVERY_ORDER_TYPES, DELIVERY_ORDER_STATUS } from '@/constants/delivery'

const props = defineProps({
  mode: { type: String, required: true, validator: (v) => ['agent', 'admin'].includes(v) },
})

const auth = useAuthStore()
const list = ref([])
const loading = ref(false)
const error = ref('')
const regions = ref([])
const filterRegionId = ref('')
const filterStatus = ref('')
const filterType = ref('')

const title = computed(() => (props.mode === 'agent' ? '本区跑腿订单' : '全平台跑腿订单'))
const showRegionFilter = computed(() => props.mode === 'admin')
const emptyHint = computed(() =>
  props.mode === 'admin' && !filterRegionId.value ? '请先选择校区' : '暂无跑腿订单'
)

function typeLabel(type) {
  return DELIVERY_ORDER_TYPES.find((t) => t.value === type)?.label || type
}

function statusTag(status) {
  const map = { open: 'info', accepted: 'warning', delivering: 'primary', completed: 'success', cancelled: 'info' }
  return map[status] || 'info'
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  if (props.mode === 'admin' && !filterRegionId.value) {
    list.value = []
    error.value = ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    const params = { pageSize: 50 }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterType.value) params.type = filterType.value
    if (props.mode === 'admin') params.regionId = filterRegionId.value
    const res =
      props.mode === 'agent'
        ? await agentApi.getAgentDeliveryOrders(params)
        : await adminApi.getAdminDeliveryOrders(params)
    list.value = res.list || []
  } catch (e) {
    error.value = e.message || '加载跑腿订单失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (props.mode === 'agent') {
    filterRegionId.value = auth.user?.regionId?._id || auth.user?.regionId || ''
    load()
  } else {
    try {
      regions.value = await adminApi.getRegions()
      if (regions.value.length) {
        filterRegionId.value = regions.value[0]._id
        load()
      }
    } catch (e) {
      error.value = e.message || '加载校区列表失败'
    }
  }
})
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
