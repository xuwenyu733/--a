<template>
  <div v-loading="loading">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-row :gutter="16">
      <el-col :xs="12" :sm="6">
        <el-statistic title="在售商品" :value="stats?.products?.onSale || 0" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-statistic title="累计订单" :value="orderTotal" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-statistic title="已完成" :value="stats?.orders?.completed || 0" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-statistic title="成交额" :value="stats?.revenue || 0" prefix="¥" />
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:20px">
      <el-col :xs="24" :md="14">
        <el-card header="近 7 日成交趋势">
          <div class="chart-box">
            <canvas ref="trendChartRef" />
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card header="在售商品分类">
          <div class="chart-box">
            <canvas ref="categoryChartRef" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:20px">
      <el-col :xs="24" :md="10">
        <el-card header="订单状态分布">
          <div class="chart-box chart-box--sm">
            <canvas v-show="statusHasData" ref="statusBarRef" />
            <div v-if="!statusHasData" class="chart-empty">暂无订单</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="14">
        <el-card header="最近订单">
          <div v-for="o in stats?.recentOrders || []" :key="o._id" class="recent-row">
            <span>{{ o.productId?.title }}</span>
            <el-tag size="small">{{ ORDER_STATUS_LABELS[o.status] }}</el-tag>
            <span class="price">¥{{ o.price }}</span>
          </div>
          <el-empty v-if="!stats?.recentOrders?.length" description="暂无订单" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as merchantApi from '@/api/merchant'
import { ORDER_STATUS_LABELS } from '@/constants/order'
import {
  CHART_COLORS,
  baseOptions,
  dualAxisScales,
  horizontalBarConfig,
  verticalBarConfig,
  renderChart,
  destroyChart,
} from '@/utils/chart'

const loading = ref(false)
const error = ref('')
const stats = ref(null)
const trendChartRef = ref(null)
const categoryChartRef = ref(null)
const statusBarRef = ref(null)
let trendChart
let categoryChart
let statusBarChart

const orderTotal = computed(() => {
  const o = stats.value?.orders
  if (!o) return 0
  return (o.pending || 0) + (o.confirmed || 0) + (o.completed || 0) + (o.cancelled || 0)
})

const statusHasData = computed(
  () => (stats.value?.charts?.orderStatusPie?.length || 0) > 0,
)

async function renderCharts() {
  const charts = stats.value?.charts
  if (!charts) return

  if (trendChartRef.value) {
    trendChart = await renderChart(trendChart, trendChartRef.value, {
      type: 'bar',
      data: {
        labels: charts.ordersTrend.map((d) => d.date),
        datasets: [
          {
            type: 'bar',
            label: '成交笔数',
            data: charts.ordersTrend.map((d) => d.count),
            backgroundColor: CHART_COLORS.primary,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: '成交额',
            data: charts.ordersTrend.map((d) => d.amount),
            borderColor: CHART_COLORS.success,
            backgroundColor: CHART_COLORS.success,
            yAxisID: 'y1',
            tension: 0.3,
          },
        ],
      },
      options: {
        ...baseOptions,
        scales: dualAxisScales(),
      },
    })
  }

  if (categoryChartRef.value) {
    const cats = charts.categoryBreakdown || []
    categoryChart = await renderChart(
      categoryChart,
      categoryChartRef.value,
      verticalBarConfig(cats.map((c) => c.label), cats.map((c) => c.count)),
    )
  }

  if (!statusHasData.value) {
    destroyChart(statusBarChart)
    statusBarChart = null
  } else {
    await nextTick()
    if (statusBarRef.value) {
      const data = charts.orderStatusPie
      const names = data.map((d) => d.name).reverse()
      const values = data.map((d) => d.value).reverse()
      statusBarChart = await renderChart(
        statusBarChart,
        statusBarRef.value,
        horizontalBarConfig(names, values, CHART_COLORS.success),
      )
    }
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await merchantApi.getMerchantStats()
    await nextTick()
    await renderCharts()
  } catch (e) {
    error.value = e.message || '加载统计数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

watch(
  () => stats.value?.charts,
  async () => {
    await nextTick()
    await renderCharts()
  },
)

onUnmounted(() => {
  destroyChart(trendChart)
  destroyChart(categoryChart)
  destroyChart(statusBarChart)
})
</script>

<style scoped>
.chart-box {
  height: 280px;
  width: 100%;
  position: relative;
}
.chart-box--sm {
  height: 240px;
}
.chart-box canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 14px;
}
.recent-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
}
.recent-row span:first-child {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.price {
  color: #f56c6c;
  font-weight: 600;
}
</style>
