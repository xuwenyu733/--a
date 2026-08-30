<template>
  <div>
    <el-alert
      v-if="error"
      type="error"
      :title="error"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    >
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <el-row v-if="loading" :gutter="16">
      <el-col v-for="i in 8" :key="i" :xs="12" :sm="8" :md="6">
        <el-skeleton animated style="padding: 16px">
          <template #template>
            <el-skeleton-item variant="text" style="width: 60%; margin-bottom: 12px" />
            <el-skeleton-item variant="h1" style="width: 40%" />
          </template>
        </el-skeleton>
      </el-col>
    </el-row>

    <template v-else-if="data">
      <el-row :gutter="16">
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="活跃用户" :value="data.userCount || 0" /></el-col>
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="区域数" :value="data.regionCount || 0" /></el-col>
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="待审核" :value="data.pendingVerifications || 0" /></el-col>
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="待审骑手" :value="data.pendingCourier || 0" /></el-col>
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="入驻商家" :value="data.merchantCount || 0" /></el-col>
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="待处理举报" :value="data.pendingReports || 0" /></el-col>
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="待接跑腿单" :value="data.deliveryOpen || 0" /></el-col>
        <el-col :xs="12" :sm="8" :md="6"><el-statistic title="跑腿总单量" :value="data.deliveryTotal || 0" /></el-col>
      </el-row>

      <DashboardCharts v-if="data.charts" :charts="data.charts" />
    </template>

    <el-card style="margin-top:20px">
      <template #header>快捷入口</template>
      <div class="quick-links">
        <el-button type="primary" link @click="$router.push('/admin/verifications')">审核中心</el-button>
        <el-button type="primary" link @click="$router.push('/admin/delivery-zones')">配送区域</el-button>
        <el-button type="primary" link @click="$router.push('/admin/delivery-orders')">跑腿订单</el-button>
        <el-button type="primary" link @click="$router.push('/admin/products')">商品管理</el-button>
        <el-button type="primary" link @click="$router.push('/admin/orders')">订单管理</el-button>
        <el-button type="primary" link @click="$router.push('/admin/reports')">举报处理</el-button>
        <el-button type="primary" link @click="$router.push('/admin/settings')">平台配置</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as adminApi from '@/api/admin'
import DashboardCharts from '@/components/DashboardCharts.vue'

const data = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await adminApi.getAdminDashboard()
  } catch (e) {
    error.value = e.message || '加载仪表盘失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
</style>
