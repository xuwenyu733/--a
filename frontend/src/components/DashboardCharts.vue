<template>
  <el-row :gutter="16" style="margin-top:20px">
    <el-col :xs="24" :md="14">
      <el-card header="近 7 日成交趋势">
        <div class="chart-box">
          <canvas ref="trendRef" />
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="10">
      <el-card header="在售商品分类">
        <div class="chart-box">
          <canvas ref="categoryRef" />
        </div>
      </el-card>
    </el-col>
  </el-row>

  <el-row :gutter="16" style="margin-top:20px">
    <el-col :xs="24" :md="8">
      <el-card header="二手订单状态">
        <div class="chart-box chart-box--sm">
          <canvas v-show="orderBarHasData" ref="orderBarRef" />
          <div v-if="!orderBarHasData" class="chart-empty">暂无订单</div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="8">
      <el-card header="跑腿订单状态">
        <div class="chart-box chart-box--sm">
          <canvas v-show="deliveryBarHasData" ref="deliveryBarRef" />
          <div v-if="!deliveryBarHasData" class="chart-empty">暂无跑腿单</div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="8">
      <el-card :header="showRegionRevenue ? '各区域成交额 TOP' : '用户角色分布'">
        <div class="chart-box chart-box--sm">
          <canvas v-show="extraHasData" ref="extraRef" />
          <div v-if="!extraHasData" class="chart-empty">{{ extraEmptyText }}</div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  CHART_COLORS,
  baseOptions,
  dualAxisScales,
  horizontalBarConfig,
  verticalBarConfig,
  renderChart,
  destroyChart,
} from '@/utils/chart'

const props = defineProps({
  charts: { type: Object, default: null },
})

const trendRef = ref(null)
const categoryRef = ref(null)
const orderBarRef = ref(null)
const deliveryBarRef = ref(null)
const extraRef = ref(null)

let trendChart
let categoryChart
let orderBarChart
let deliveryBarChart
let extraChart

const showRegionRevenue = computed(
  () => (props.charts?.regionRevenue?.length || 0) > 0,
)

const orderBarHasData = computed(() => (props.charts?.orderStatusPie?.length || 0) > 0)
const deliveryBarHasData = computed(() => (props.charts?.deliveryStatusPie?.length || 0) > 0)
const extraHasData = computed(() => {
  if (showRegionRevenue.value) return (props.charts?.regionRevenue?.length || 0) > 0
  return (props.charts?.userRolePie?.length || 0) > 0
})
const extraEmptyText = computed(() => (showRegionRevenue.value ? '暂无数据' : '暂无用户'))

function disposeAll() {
  destroyChart(trendChart)
  destroyChart(categoryChart)
  destroyChart(orderBarChart)
  destroyChart(deliveryBarChart)
  destroyChart(extraChart)
  trendChart = categoryChart = orderBarChart = deliveryBarChart = extraChart = null
}

function hBarFromPieData(data) {
  const names = data.map((d) => d.name).reverse()
  const values = data.map((d) => d.value).reverse()
  return horizontalBarConfig(names, values)
}

async function renderTrendChart(c) {
  if (!trendRef.value) return
  const trend = c.ordersTrend || []
  trendChart = await renderChart(trendChart, trendRef.value, {
    type: 'bar',
    data: {
      labels: trend.map((d) => d.date),
      datasets: [
        {
          type: 'bar',
          label: '二手成交',
          data: trend.map((d) => d.orderCount),
          backgroundColor: CHART_COLORS.primary,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: '二手金额',
          data: trend.map((d) => d.orderAmount),
          borderColor: CHART_COLORS.success,
          backgroundColor: CHART_COLORS.success,
          yAxisID: 'y1',
          tension: 0.3,
        },
        {
          type: 'bar',
          label: '跑腿完成',
          data: trend.map((d) => d.deliveryCount),
          backgroundColor: CHART_COLORS.warning,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: '跑腿金额',
          data: trend.map((d) => d.deliveryAmount),
          borderColor: CHART_COLORS.danger,
          backgroundColor: CHART_COLORS.danger,
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

async function renderCategoryChart(c) {
  if (!categoryRef.value) return
  const cats = c.categoryBreakdown || []
  categoryChart = await renderChart(
    categoryChart,
    categoryRef.value,
    verticalBarConfig(cats.map((x) => x.label), cats.map((x) => x.count)),
  )
}

async function renderOrderBar(c) {
  if (!orderBarHasData.value) {
    destroyChart(orderBarChart)
    orderBarChart = null
    return
  }
  await nextTick()
  if (!orderBarRef.value) return
  orderBarChart = await renderChart(
    orderBarChart,
    orderBarRef.value,
    hBarFromPieData(c.orderStatusPie),
  )
}

async function renderDeliveryBar(c) {
  if (!deliveryBarHasData.value) {
    destroyChart(deliveryBarChart)
    deliveryBarChart = null
    return
  }
  await nextTick()
  if (!deliveryBarRef.value) return
  deliveryBarChart = await renderChart(
    deliveryBarChart,
    deliveryBarRef.value,
    hBarFromPieData(c.deliveryStatusPie),
  )
}

async function renderExtraChart(c) {
  if (!extraHasData.value) {
    destroyChart(extraChart)
    extraChart = null
    return
  }
  await nextTick()
  if (!extraRef.value) return

  if (showRegionRevenue.value) {
    const regions = c.regionRevenue
    const names = regions.map((r) => r.name).reverse()
    const amounts = regions.map((r) => r.amount).reverse()
    const cfg = horizontalBarConfig(names, amounts)
    cfg.options.plugins = {
      ...cfg.options.plugins,
      tooltip: {
        callbacks: {
          label: (ctx) => ` ¥${ctx.parsed.x}`,
        },
      },
    }
    extraChart = await renderChart(extraChart, extraRef.value, cfg)
  } else {
    extraChart = await renderChart(
      extraChart,
      extraRef.value,
      hBarFromPieData(c.userRolePie),
    )
  }
}

async function renderCharts() {
  const c = props.charts
  if (!c) return
  await renderTrendChart(c)
  await renderCategoryChart(c)
  await renderOrderBar(c)
  await renderDeliveryBar(c)
  await renderExtraChart(c)
}

watch(
  () => props.charts,
  async () => {
    await nextTick()
    await renderCharts()
  },
  { deep: true },
)

onMounted(async () => {
  await nextTick()
  await renderCharts()
})

onUnmounted(disposeAll)
</script>

<style scoped>
.chart-box {
  height: 280px;
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
</style>
