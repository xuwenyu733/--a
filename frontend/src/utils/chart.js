/**
 * Chart.js 按需注册：仅 bar / line + 基础 scale / 插件
 */
let ChartClass = null

async function loadChartJs() {
  if (ChartClass) return ChartClass

  const {
    Chart,
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Legend,
    Tooltip,
    Title,
  } = await import('chart.js')

  Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Legend,
    Tooltip,
    Title,
  )

  ChartClass = Chart
  return ChartClass
}

/** @returns {Promise<typeof import('chart.js').Chart>} */
export async function getChart() {
  return loadChartJs()
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {import('chart.js').ChartConfiguration} config
 */
export async function createChart(canvas, config) {
  const Chart = await loadChartJs()
  return new Chart(canvas, config)
}

export function destroyChart(chart) {
  chart?.destroy()
}

/**
 * 更新已有实例，避免重复创建
 * @param {import('chart.js').Chart|null} chart
 * @param {HTMLCanvasElement} canvas
 * @param {import('chart.js').ChartConfiguration} config
 */
export async function renderChart(chart, canvas, config) {
  if (!canvas) return chart
  if (chart) {
    chart.data = config.data
    if (config.options) chart.options = config.options
    if (config.type) chart.config.type = config.type
    chart.update()
    return chart
  }
  return createChart(canvas, config)
}

export const CHART_COLORS = {
  primary: '#409eff',
  success: '#67c23a',
  warning: '#e6a23c',
  danger: '#f56c6c',
}

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
  },
}

/** 双 Y 轴：左笔数、右金额 */
export function dualAxisScales(countLabel = '笔数', amountLabel = '元') {
  return {
    y: {
      type: 'linear',
      position: 'left',
      title: { display: true, text: countLabel },
      ticks: { stepSize: 1 },
    },
    y1: {
      type: 'linear',
      position: 'right',
      title: { display: true, text: amountLabel },
      grid: { drawOnChartArea: false },
    },
  }
}

/** 横向柱状图配置 */
export function horizontalBarConfig(labels, values, color = CHART_COLORS.primary) {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: color,
        borderRadius: 4,
      }],
    },
    options: {
      ...baseOptions,
      indexAxis: 'y',
      plugins: { ...baseOptions.plugins, legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  }
}

/** 纵向分类柱状图 */
export function verticalBarConfig(labels, values, color = CHART_COLORS.primary) {
  const rotate = labels.length > 4 ? 28 : 0
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: color,
        borderRadius: 4,
      }],
    },
    options: {
      ...baseOptions,
      plugins: { ...baseOptions.plugins, legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: rotate, minRotation: rotate } },
      },
    },
  }
}
