<template>
  <view class="container">
    <view class="home-search" @tap="goSearch">
      <text class="home-search-ico">🔍</text>
      <text class="home-search-ph">搜索商品、用户名或好友号</text>
    </view>

    <view v-if="platform.announcement" class="announcement">{{ platform.announcement }}</view>

    <swiper v-if="displayBanners.length" class="banner" indicator-dots circular autoplay>
      <swiper-item v-for="(b, i) in displayBanners" :key="i" @tap="goLink(b.link)">
        <view class="banner-slide">
          <text class="banner-title">{{ b.title }}</text>
          <text class="banner-sub">{{ b.subtitle }}</text>
        </view>
      </swiper-item>
    </swiper>

    <view class="hero card">
      <text class="hero-title">🎓 校园市集</text>
      <text class="hero-sub muted">二手 · 跑腿 · 简历 · 仅限本校师生</text>
      <view class="entry-grid">
        <view class="entry-item" @tap="goMarket">
          <image class="entry-icon" :src="homeIcon('market')" mode="aspectFit" />
        </view>
        <view class="entry-item" @tap="goDelivery">
          <image class="entry-icon" :src="homeIcon('delivery')" mode="aspectFit" />
        </view>
        <view class="entry-item" @tap="goResume">
          <image class="entry-icon" :src="homeIcon('resume')" mode="aspectFit" />
        </view>
        <view class="entry-item" @tap="onPublishEntry">
          <image class="entry-icon" :src="homeIcon('publish')" mode="aspectFit" />
        </view>
      </view>
    </view>

    <view v-if="recommended.length" class="section">
      <view class="section-header">
        <text class="section-title">🔥 热门推荐</text>
        <text class="link" @tap="goMarketSort('favoriteCount')">更多</text>
      </view>
      <view class="grid-wrap">
        <view class="grid-2">
          <view v-for="p in recommended" :key="p._id" class="grid-2-item">
            <ProductCard :product="p" />
          </view>
        </view>
      </view>
    </view>

    <view v-if="groupBuyList.length" class="section">
      <view class="section-header">
        <text class="section-title">🛒 拼单专区</text>
        <text class="link" @tap="goGroupBuy">更多</text>
      </view>
      <view class="grid-wrap">
        <view class="grid-2">
          <view v-for="p in groupBuyList" :key="p._id" class="grid-2-item">
            <ProductCard :product="p" />
          </view>
        </view>
      </view>
    </view>

    <view class="section-header">
      <text class="section-title">最新发布</text>
      <text class="link" @tap="goMarket">更多</text>
    </view>

    <ProductGridSkeleton v-if="loading && !products.length" :count="6" />
    <LoadState
      v-else-if="loadError && !products.length"
      :error="loadError"
      :has-data="products.length > 0"
      :show-empty="false"
      @retry="loadData(true)"
    />
    <view v-else-if="!loading && !loadError && !products.length" class="empty">暂无商品</view>
    <view v-else class="grid-wrap">
      <view class="grid-2">
        <view v-for="p in products" :key="p._id" class="grid-2-item">
          <ProductCard :product="p" />
        </view>
      </view>
    </view>
    <view v-if="loadingMore" class="load-more muted">加载中…</view>
    <view v-else-if="!hasMore && products.length" class="load-more muted">没有更多了</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow, onPullDownRefresh, onReachBottom, onUnload } from '@dcloudio/uni-app'
import { throttle } from '@/utils/debounce'
import config from '@/config/index'
import { getProducts, getRecommended } from '@/api/product'
import { getPlatformConfig } from '@/api/config'
import { ensureGuestRegion } from '@/utils/region'
import { getFileUrl } from '@/utils/fileUrl'
import { isLoggedIn, getUser, promptLogin } from '@/utils/auth'
import ProductCard from '@/components/ProductCard.vue'
import LoadState from '@/components/LoadState.vue'
import ProductGridSkeleton from '@/components/ProductGridSkeleton.vue'
import { openPageSafe } from '@/utils/navigate'

const products = ref([])
const recommended = ref([])
const groupBuyList = ref([])
const platform = ref({ banners: [], announcement: '' })
const page = ref(1)
const hasMore = ref(true)
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref('')
const loggedIn = ref(false)
let firstShow = true

const DEFAULT_BANNERS = [
  { title: '闲置交易', subtitle: '本校面交 · 零手续费', link: '/pages/products/list' },
  { title: '校园跑腿', subtitle: '外卖代取 · 快递代取', link: '/pages/delivery/index' },
]

const displayBanners = computed(() => {
  const list = platform.value.banners
  return Array.isArray(list) && list.length ? list : DEFAULT_BANNERS
})

const canPublish = computed(() => {
  const u = getUser()
  if (!u) return false
  if (u.role === 'merchant') return true
  return u.role === 'student' && u.studentVerified
})

onLoad(() => loadData(false))

onShow(() => {
  loggedIn.value = isLoggedIn()
  if (firstShow) {
    firstShow = false
    return
  }
  loadData(true)
})

onPullDownRefresh(() => loadData(true).finally(() => uni.stopPullDownRefresh()))
/** 触底加载节流 + 请求锁 */
const loadMoreThrottled = throttle(() => {
  if (!hasMore.value || loading.value || loadingMore.value || productFetching) return
  loadProducts(false)
}, 800)
onReachBottom(() => loadMoreThrottled())
onUnload(() => loadMoreThrottled.cancel?.())

let loadingData = false
let productFetching = false

function withCover(list) {
  return (list || []).map((p) => ({
    ...p,
    cover: getFileUrl(p.images?.[0]),
  }))
}

async function loadData(refresh) {
  if (loadingData && !refresh) return
  loadingData = true
  try {
    if (refresh) {
      await Promise.all([loadPlatform(), loadSideSections(), loadProducts(true)])
    } else {
      await Promise.allSettled([
        loadPlatform(),
        loadSideSections(),
        loadProducts(true),
      ])
    }
  } finally {
    loadingData = false
  }
}

async function loadPlatform() {
  try {
    const cfg = (await getPlatformConfig()) || {}
    platform.value = {
      announcement: cfg.announcement || '',
      banners: Array.isArray(cfg.banners) ? cfg.banners : [],
    }
  } catch {
    platform.value = { banners: [], announcement: '' }
  }
}

async function loadSideSections() {
  try {
    const regionId = await ensureGuestRegion()
    const [rec, group] = await Promise.all([
      getRecommended({ regionId, limit: 4 }).catch((err) => {
        console.warn('getRecommended failed', err)
        return { list: [] }
      }),
      getProducts({ regionId, pageSize: 4, groupBuyOnly: true }).catch((err) => {
        console.warn('getGroupBuyProducts failed', err)
        return { list: [] }
      }),
    ])
    recommended.value = withCover(rec.list)
    groupBuyList.value = withCover(group.list)
  } catch {
    recommended.value = []
    groupBuyList.value = []
  }
}

async function loadProducts(reset) {
  if (productFetching) return
  if (!reset && (!hasMore.value || loadingMore.value)) return
  productFetching = true
  if (reset) {
    loading.value = true
    page.value = 1
    hasMore.value = true
    loadError.value = ''
  } else {
    loadingMore.value = true
  }
  try {
    const regionId = await ensureGuestRegion()
    const nextPage = reset ? 1 : page.value + 1
    const res = await getProducts({
      regionId,
      page: nextPage,
      pageSize: config.PAGE_SIZE || 30,
      sort: 'createdAt',
      order: 'desc',
    })
    const list = withCover(res.list)
    const total = res.pagination?.total || 0
    products.value = reset ? list : [...products.value, ...list]
    page.value = nextPage
    hasMore.value = list.length >= (config.PAGE_SIZE || 30) && products.value.length < total
  } catch (e) {
    if (reset) {
      products.value = []
      loadError.value = e.message || '加载失败，请检查网络或后端服务'
    }
  } finally {
    loading.value = false
    loadingMore.value = false
    productFetching = false
  }
}

/** 运行时拼接路径，避免编译产物依赖 common/assets.js */
function homeIcon(name) {
  return `/static/home/${name}.png`
}

function goMarket() { uni.switchTab({ url: '/pages/products/list' }) }
function goSearch() {
  openPageSafe('/pages/search/index')
}
function goMarketSort(sort) {
  uni.setStorageSync('market_filter', { sort, groupBuyOnly: false })
  uni.switchTab({ url: '/pages/products/list' })
}
function goGroupBuy() {
  uni.setStorageSync('market_filter', { groupBuyOnly: true })
  uni.switchTab({ url: '/pages/products/list' })
}
function goLogin() { openPageSafe('/pages/login/login') }
function goPublish() { openPageSafe('/pages/products/publish') }
function goVerify() { openPageSafe('/pages/user/verify-student') }
async function goDelivery() {
  if (!(await promptLogin({ content: '登录后即可使用校园跑腿' }))) return
  openPageSafe('/pages/delivery/index')
}
async function goResume() {
  if (!(await promptLogin({ content: '登录后即可查看我的简历' }))) return
  openPageSafe('/pages/resume/build')
}
async function onPublishEntry() {
  if (!(await promptLogin({ content: '登录后即可发布闲置' }))) return
  if (canPublish.value) {
    goPublish()
  } else {
    uni.showModal({
      title: '需要学生认证',
      content: '认证通过后即可发布闲置商品',
      confirmText: '去认证',
      success(res) {
        if (res.confirm) goVerify()
      },
    })
  }
}
function goLink(link) {
  if (!link) return goMarket()
  openPageSafe(link)
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  width: 100%;
  display: block;
  box-sizing: border-box;
}

.home-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 16rpx 0 8rpx;
  padding: 18rpx 24rpx;
  background: #fff;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.home-search:active {
  opacity: 0.85;
}

.home-search-ico {
  font-size: 28rpx;
}

.home-search-ph {
  font-size: 26rpx;
  color: #c0c4cc;
}

.hero {
  width: 100%;
  box-sizing: border-box;
}

.hero-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #303133;
}

.hero-sub {
  display: block;
  margin-top: 12rpx;
}

.entry-grid {
  margin-top: 28rpx;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8rpx;
}

.entry-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.entry-item:active {
  opacity: 0.82;
  transform: scale(0.97);
}

.entry-icon {
  width: 152rpx;
  height: 168rpx;
}

.section {
  margin-bottom: 8rpx;
  width: 100%;
}

.grid-wrap {
  display: block;
  width: 100%;
  clear: both;
}
</style>
