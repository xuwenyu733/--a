<template>
  <view class="page">
    <!-- 标题可上滑；搜索栏为页面级 sticky，勿再包进父容器 -->
    <view class="header">
      <text class="header-title">🛍️ 校园市集</text>
      <text class="header-sub">本校闲置 · 当面验货 · 零手续费</text>
    </view>

    <view class="sticky-bar" :class="{ 'is-fixed': searchPinned }">
      <CartEntryBtn ref="cartBtnRef" variant="toolbar" />
      <view class="search-wrap">
        <view class="search-field">
          <text class="search-icon">🔍</text>
          <input
            class="search-input"
            placeholder="搜索商品名称、描述…"
            placeholder-class="ph"
            v-model="keyword"
            confirm-type="search"
            @confirm="onSearch"
            @input="onKeywordInput"
          />
        </view>
        <view class="search-btn" @tap="onSearch">搜索</view>
      </view>
    </view>
    <view v-if="searchPinned" class="sticky-placeholder" :style="{ height: stickyBarHeight + 'px' }" />

    <view class="main">
      <!-- 搜索历史 & 热门 -->
      <view v-if="!keyword && (history.length || hotWords.length)" class="search-hint card">
        <view v-if="history.length" class="hint-section">
          <view class="hint-head">
            <text class="hint-title">搜索历史</text>
            <text class="hint-clear" @tap="clearHistory">清空</text>
          </view>
          <view class="hint-tags">
            <text v-for="w in history" :key="w" class="hint-tag" @tap="searchWord(w)">{{ w }}</text>
          </view>
        </view>
        <view v-if="hotWords.length" class="hint-section">
          <view class="hint-head">
            <text class="hint-title">🔥 热门搜索</text>
          </view>
          <view class="hint-tags">
            <text v-for="w in hotWords" :key="w" class="hint-tag hot" @tap="searchWord(w)">{{ w }}</text>
          </view>
        </view>
      </view>

      <!-- 分类 / 排序筛选 -->
      <view class="filter-card">
        <view class="filter-line">
          <text class="filter-label">分类</text>
          <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false" enable-flex>
            <view class="filter-row">
              <view class="chip" :class="{ active: category === '' }" @tap="setCategory('')">全部</view>
              <view
                v-for="c in categories"
                :key="c.value"
                class="chip"
                :class="{ active: category === c.value }"
                @tap="setCategory(c.value)"
              >{{ c.label }}</view>
            </view>
          </scroll-view>
        </view>
        <view class="filter-line">
          <text class="filter-label">排序</text>
          <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false" enable-flex>
            <view class="filter-row">
              <view
                v-for="s in sortOptions"
                :key="s.value"
                class="chip"
                :class="{ active: sort === s.value }"
                @tap="setSort(s.value)"
              >{{ s.label }}</view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 已加载数量（每次 30 条触底加载） -->
      <view v-if="products.length && !loading" class="result-bar">
        <text class="result-count">已加载 {{ products.length }} 件{{ hasMore ? '，上拉加载更多' : '' }}</text>
      </view>

      <!-- 商品列表 -->
      <view class="grid-wrap">
        <ProductGridSkeleton v-if="loading && !products.length" :count="6" />
        <LoadState
          v-else
          :loading="false"
          :error="loadError"
          :has-data="products.length > 0"
          empty-text="暂无商品"
          empty-hint="换个分类或关键词试试"
          @retry="loadProducts(true)"
        />
        <view v-if="products.length" class="grid-2">
          <view v-for="p in products" :key="p._id" class="grid-2-item">
            <ProductCard :product="p" />
          </view>
        </view>
        <view v-if="loadingMore" class="load-more">加载中…</view>
        <view v-else-if="!hasMore && products.length" class="load-more">— 没有更多了 —</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onReady, onPageScroll, onPullDownRefresh, onReachBottom, onUnload } from '@dcloudio/uni-app'
import config from '@/config/index'
import { getFileUrl } from '@/utils/fileUrl'
import { getProducts } from '@/api/product'
import { ensureGuestRegion } from '@/utils/region'
import { CATEGORIES, SORT_OPTIONS } from '@/constants/product'
import { debounce, throttle } from '@/utils/debounce'
import ProductCard from '@/components/ProductCard.vue'
import LoadState from '@/components/LoadState.vue'
import ProductGridSkeleton from '@/components/ProductGridSkeleton.vue'
import CartEntryBtn from '@/components/CartEntryBtn.vue'

/** 每页固定 30 条，触底再拉取下一页 */
const PAGE_SIZE = config.PAGE_SIZE || 30

const products = ref([])
const keyword = ref('')
const category = ref('')
const sort = ref('createdAt')
const page = ref(1)
const total = ref(0)
const hasMore = ref(true)
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref('')
const categories = CATEGORIES
const sortOptions = SORT_OPTIONS
const cartBtnRef = ref(null)
const searchPinned = ref(false)
const stickyBarHeight = ref(0)
let headerHeightPx = 0
let firstShow = true
/** 请求锁，避免并发重复拉取 */
let fetching = false

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10
const hotWords = ['教材', '手机', '耳机', '台灯', '自行车', '考研资料', '键盘']
const history = ref([])

function loadHistory() {
  try {
    history.value = uni.getStorageSync(HISTORY_KEY) || []
  } catch {
    history.value = []
  }
}
loadHistory()

function saveHistory(word) {
  const w = word.trim()
  if (!w) return
  history.value = [w, ...history.value.filter((h) => h !== w)].slice(0, MAX_HISTORY)
  uni.setStorageSync(HISTORY_KEY, history.value)
}

function clearHistory() {
  history.value = []
  uni.removeStorageSync(HISTORY_KEY)
  uni.showToast({ title: '已清空', icon: 'none' })
}

function searchWord(w) {
  keyword.value = w
  onSearch()
}

onLoad((options) => {
  applyOptions(options)
  loadProducts(true)
})

onReady(() => {
  measureStickyMetrics()
})

const onScrollPinned = throttle((e) => {
  const top = e?.scrollTop ?? 0
  searchPinned.value = top >= Math.max(0, headerHeightPx - 1)
}, 50)
onPageScroll(onScrollPinned)

function measureStickyMetrics() {
  uni.createSelectorQuery()
    .select('.header')
    .boundingClientRect()
    .select('.sticky-bar')
    .boundingClientRect()
    .exec((res) => {
      const headerRect = res?.[0]
      const barRect = res?.[1]
      if (headerRect?.height) headerHeightPx = headerRect.height
      if (barRect?.height) stickyBarHeight.value = barRect.height
    })
}

onShow(() => {
  cartBtnRef.value?.refresh?.()
  measureStickyMetrics()
  if (firstShow) {
    firstShow = false
    return
  }
  const filter = uni.getStorageSync('market_filter')
  if (filter) {
    uni.removeStorageSync('market_filter')
    if (filter.sort) sort.value = filter.sort
    if (filter.keyword != null) keyword.value = String(filter.keyword)
    loadProducts(true)
  }
})

function applyOptions(options = {}) {
  if (options.sort) sort.value = options.sort
}

/** 下拉刷新防抖 */
const refreshDebounced = debounce(() => {
  loadProducts(true).finally(() => {
    cartBtnRef.value?.refresh?.()
    uni.stopPullDownRefresh()
  })
}, 300)
onPullDownRefresh(() => refreshDebounced())

/** 触底加载节流 */
const loadMoreThrottled = throttle(() => {
  if (!hasMore.value || loading.value || loadingMore.value || fetching) return
  loadProducts(false)
}, 800)
onReachBottom(() => loadMoreThrottled())

/** 输入搜索防抖 */
const searchDebounced = debounce(() => {
  if (keyword.value.trim()) saveHistory(keyword.value.trim())
  loadProducts(true)
}, 400)

onUnload(() => {
  refreshDebounced.cancel?.()
  loadMoreThrottled.cancel?.()
  searchDebounced.cancel?.()
  onScrollPinned.cancel?.()
})

function onSearch() {
  searchDebounced.cancel?.()
  if (keyword.value.trim()) saveHistory(keyword.value.trim())
  loadProducts(true)
}

function onKeywordInput() {
  searchDebounced()
}

function setCategory(cat) {
  category.value = cat
  loadProducts(true)
}
function setSort(val) {
  sort.value = val
  loadProducts(true)
}
async function loadProducts(reset) {
  if (fetching) return
  if (!reset && (!hasMore.value || loadingMore.value)) return

  fetching = true
  if (reset) {
    loading.value = true
    page.value = 1
    hasMore.value = true
    total.value = 0
  } else {
    loadingMore.value = true
  }
  try {
    loadError.value = ''
    const regionId = await ensureGuestRegion()
    const nextPage = reset ? 1 : page.value + 1
    const sortOpt = SORT_OPTIONS.find((s) => s.value === sort.value) || SORT_OPTIONS[0]
    const params = {
      regionId,
      page: nextPage,
      pageSize: PAGE_SIZE,
      sort: sortOpt.value,
      order: sortOpt.order,
    }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (category.value) params.category = category.value
    const res = await getProducts(params)
    const list = (res.list || []).map((p) => ({
      ...p,
      cover: getFileUrl(p.images?.[0]),
    }))
    const nextTotal = res.pagination?.total ?? 0
    total.value = nextTotal
    products.value = reset ? list : [...products.value, ...list]
    page.value = nextPage
    hasMore.value = list.length >= PAGE_SIZE && products.value.length < nextTotal
  } catch (e) {
    loadError.value = e.message || '加载失败，请检查网络或后端服务'
  } finally {
    loading.value = false
    loadingMore.value = false
    fetching = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f5;
}

/* 顶部：标题与搜索同色无圆角；sticky 必须是 .page 的直接子节点 */
.header {
  padding: 32rpx 24rpx 8rpx;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
}

.header-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.header-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.88);
}

.sticky-bar {
  position: relative;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx 20rpx;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  box-sizing: border-box;
}

.sticky-bar.is-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}

.sticky-placeholder {
  width: 100%;
  background: transparent;
}

.search-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 8rpx 8rpx 8rpx 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  overflow: hidden;
}

.search-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 10rpx;
  flex-shrink: 0;
  line-height: 1;
}

.search-input {
  flex: 1;
  width: 0;
  min-width: 0;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 28rpx;
  color: #303133;
  box-sizing: border-box;
}

.ph {
  color: #c0c4cc;
  font-size: 26rpx;
}

.search-btn {
  flex-shrink: 0;
  height: 60rpx;
  line-height: 60rpx;
  padding: 0 24rpx;
  margin-left: 8rpx;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
  border-radius: 30rpx;
  white-space: nowrap;
}

.search-btn:active {
  opacity: 0.85;
}

/* 搜索历史 */
.search-hint {
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}
.hint-section {
  margin-bottom: 12rpx;
}
.hint-section:last-child {
  margin-bottom: 0;
}
.hint-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}
.hint-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #303133;
}
.hint-clear {
  font-size: 24rpx;
  color: #909399;
}
.hint-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.hint-tag {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  background: #f5f7fa;
  border-radius: 999rpx;
  color: #606266;
}
.hint-tag.hot {
  color: #e6a23c;
}
.hint-tag:active {
  background: #ecf5ff;
  color: #409eff;
}

.main {
  padding: 0 24rpx 32rpx;
  position: relative;
  z-index: 1;
}

/* 筛选 */
.filter-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 16rpx 16rpx 8rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.filter-line {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12rpx;
}

.filter-line:last-child {
  margin-bottom: 4rpx;
}

.filter-label {
  flex-shrink: 0;
  width: 56rpx;
  font-size: 22rpx;
  color: #909399;
  font-weight: 500;
  line-height: 1.4;
}

.filter-scroll {
  flex: 1;
  width: 0;
  min-width: 0;
  white-space: nowrap;
}

.filter-row {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  padding: 2rpx 0;
}

.chip {
  display: inline-block;
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  margin-right: 12rpx;
  background: #f5f7fa;
  border: 2rpx solid transparent;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #606266;
  line-height: 1.4;
}

.chip.active {
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4rpx 12rpx rgba(64, 158, 255, 0.3);
}

.result-bar {
  padding: 8rpx 8rpx 16rpx;
}

.result-count {
  font-size: 24rpx;
  color: #909399;
}

/* 商品网格 */
.grid-wrap {
  width: 100%;
}

.grid-2 {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.grid-2-item {
  width: calc(50% - 10rpx);
  margin-bottom: 20rpx;
  box-sizing: border-box;
}

.load-more {
  text-align: center;
  padding: 24rpx 0 16rpx;
  font-size: 24rpx;
  color: #c0c4cc;
}
</style>
