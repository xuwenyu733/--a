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

    <div v-loading="loading">
      <el-row v-if="data" :gutter="16">
        <el-col :xs="12" :sm="6"><el-statistic title="待审学生认证" :value="data.pendingStudent || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="待审商家入驻" :value="data.pendingMerchant || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="待审骑手认证" :value="data.pendingCourier || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="待处理举报" :value="data.pendingReports || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="区域用户" :value="data.userCount || 0" /></el-col>
      </el-row>

      <el-row v-if="stats" :gutter="16" style="margin-top:20px">
        <el-col :xs="12" :sm="6"><el-statistic title="在售商品" :value="stats.products?.onSale || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="二手成交" :value="stats.orders?.completed || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="区域成交额" :value="stats.revenue || 0" prefix="¥" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="入驻商家" :value="stats.users?.merchants || 0" /></el-col>
      </el-row>

      <el-row v-if="stats?.delivery" :gutter="16" style="margin-top:16px">
        <el-col :xs="12" :sm="6"><el-statistic title="待接跑腿单" :value="stats.delivery?.open || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="跑腿已完成" :value="stats.delivery?.completed || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="跑腿总单量" :value="stats.delivery?.total || 0" /></el-col>
        <el-col :xs="12" :sm="6"><el-statistic title="认证骑手" :value="stats.couriers || 0" /></el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top:12px">
        <el-col :span="6">
          <el-button type="primary" link @click="$router.push('/agent/reports')">处理举报 →</el-button>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" link @click="$router.push('/agent/verifications')">审核中心 →</el-button>
          <el-button type="primary" link @click="$router.push('/agent/delivery-zones')">配送区域 →</el-button>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" link @click="$router.push('/agent/delivery-orders')">跑腿订单 →</el-button>
          <el-button type="primary" link @click="$router.push('/agent/orders')">二手订单 →</el-button>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" link @click="$router.push('/agent/audit-logs')">操作日志 →</el-button>
        </el-col>
      </el-row>

      <DashboardCharts v-if="stats?.charts" :charts="stats.charts" />

      <el-card v-if="data?.region" style="margin-top:20px">
        <p>负责区域：<strong>{{ data.region.name }}</strong></p>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as agentApi from '@/api/agent'
import DashboardCharts from '@/components/DashboardCharts.vue'

const data = ref(null)
const loading = ref(true)
const error = ref('')
const stats = computed(() => data.value?.regionStats)

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await agentApi.getAgentDashboard()
  } catch (e) {
    error.value = e.message || '加载区域概览失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
