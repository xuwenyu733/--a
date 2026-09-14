<template>
  <div class="home">
    <el-alert v-if="platform.announcement" :title="platform.announcement" type="info" show-icon :closable="false" class="announcement" />

    <el-carousel v-if="platform.banners?.length" height="200px" class="banner-carousel" indicator-position="outside">
      <el-carousel-item v-for="(b, i) in platform.banners" :key="i">
        <div class="banner-slide" @click="goLink(b.link)">
          <div class="banner-text">
            <h2>{{ b.title }}</h2>
            <p>{{ b.subtitle }}</p>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>

    <section class="service-grid">
      <el-card class="service-card service-card--trade" shadow="hover" @click="$router.push('/products')">
        <div class="service-icon">🛒</div>
        <h2>校园二手</h2>
        <p>本校闲置交易 · 当面验货 · 即时聊天 · 零手续费</p>
        <el-button type="primary">进入市集</el-button>
      </el-card>
      <el-card
        class="service-card service-card--resume-build"
        shadow="hover"
        @click="goResumeBuild"
      >
        <div class="service-icon">✍️</div>
        <h2>AI 简历创作</h2>
        <p>在线填写项目与技术栈 · 一键生成 A4 单页简历</p>
        <el-button type="success">{{ auth.isLoggedIn ? '开始创作' : '登录后使用' }}</el-button>
      </el-card>
      <el-card class="service-card service-card--delivery" shadow="hover" @click="goDelivery">
        <div class="service-icon">🛵</div>
        <h2>校园跑腿</h2>
        <p>外卖代取 · 快递代取 · 骑手接单配送</p>
        <el-button type="warning" plain>{{ auth.isLoggedIn ? '进入跑腿' : '登录后使用' }}</el-button>
      </el-card>
    </section>

    <el-card class="hero">
      <h1>校园生活服务平台</h1>
      <p>交易与求职一站搞定 · 仅限本校师生与认证商家</p>
      <div class="actions">
        <el-button type="primary" size="large" @click="$router.push('/products')">浏览商品</el-button>
        <el-button v-if="auth.isLoggedIn" size="large" type="warning" plain @click="goDelivery">校园跑腿</el-button>
        <el-button v-if="auth.isLoggedIn" size="large" type="success" @click="goResumeBuild">简历创作</el-button>
        <el-button v-if="canPublish" size="large" @click="goPublish">发布闲置</el-button>
        <el-button v-else-if="auth.isLoggedIn && auth.user?.role === 'student'" size="large" @click="$router.push('/user/verify/student')">去学生认证</el-button>
        <el-button v-else size="large" @click="$router.push('/register')">立即加入</el-button>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="section-header">
          <span>最新发布</span>
          <el-button link type="primary" @click="$router.push('/products')">查看更多</el-button>
        </div>
      </template>
      <div
        v-infinite-scroll="loadMoreLatest"
        :infinite-scroll-disabled="loading || loadingMore || !hasMoreLatest"
        :infinite-scroll-distance="160"
        :infinite-scroll-immediate="false"
        class="latest-products-scroll"
      >
        <el-alert v-if="latestError" type="error" :title="latestError" show-icon :closable="false" style="margin-bottom: 12px">
          <el-button link type="primary" @click="fetchLatestProducts(false)">重试</el-button>
        </el-alert>
        <ProductGridSkeleton v-if="loading && !latestProducts.length" :count="PAGE_SIZE" />
        <el-row v-else :gutter="16">
          <el-col v-for="p in latestProducts" :key="p._id" :xs="12" :sm="8" :md="6">
            <ProductCard :product="p" />
          </el-col>
        </el-row>
        <el-empty v-if="!loading && !latestError && !latestProducts.length" description="暂无商品，快来发布第一件吧" />
        <div v-if="loadingMore" class="load-more-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          加载中…
        </div>
        <div v-else-if="latestProducts.length && !hasMoreLatest" class="load-more-tip">没有更多了</div>
      </div>
    </el-card>

    <el-card v-if="recommendedProducts.length" style="margin-top:20px">
      <template #header>
        <div class="section-header">
          <span>🔥 热门推荐</span>
          <el-button link type="primary" @click="$router.push('/products?sort=favoriteCount')">查看更多</el-button>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col v-for="p in recommendedProducts" :key="p._id" :xs="12" :sm="8" :md="6">
          <ProductCard :product="p" />
        </el-col>
      </el-row>
    </el-card>

    <el-alert v-if="auth.isLoggedIn" :title="`欢迎回来，${auth.user?.nickname}`" type="success" show-icon :closable="false" style="margin-top:20px" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useRegion } from '@/composables/useRegion'
import * as productApi from '@/api/product'
import * as configApi from '@/api/config'
import ProductCard from '@/components/ProductCard.vue'
import ProductGridSkeleton from '@/components/ProductGridSkeleton.vue'

const PAGE_SIZE = 10

const auth = useAuthStore()
const router = useRouter()
const { regionId, ensureGuestRegion } = useRegion()
const loading = ref(false)
const loadingMore = ref(false)
const latestError = ref('')
const latestPage = ref(1)
const latestTotal = ref(0)
const cachedRegionId = ref('')
const latestProducts = ref([])
const recommendedProducts = ref([])
const platform = ref({ banners: [], announcement: '' })

const hasMoreLatest = computed(() => latestProducts.value.length < latestTotal.value)

const canPublish = computed(() => {
  if (!auth.isLoggedIn) return false
  if (auth.user?.role === 'merchant') return true
  if (auth.user?.role === 'student' && auth.user?.studentVerified) return true
  return false
})

function goLink(link) {
  if (link) router.push(link.startsWith('/') ? link : `/${link}`)
}

function goPublish() {
  if (auth.user?.role === 'merchant') router.push('/merchant/products/new')
  else router.push('/products/new')
}

function goResumeBuild() {
  if (!auth.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: '/resume/build' } })
    return
  }
  router.push('/resume/build')
}

function goDelivery() {
  if (!auth.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: '/delivery' } })
    return
  }
  router.push('/delivery')
}

async function fetchLatestProducts(append = false) {
  if (append) {
    if (loadingMore.value || loading.value || !hasMoreLatest.value) return
    loadingMore.value = true
  } else {
    loading.value = true
    latestPage.value = 1
    latestError.value = ''
  }

  try {
    const rid = cachedRegionId.value || regionId.value || (await ensureGuestRegion())
    cachedRegionId.value = rid
    const page = append ? latestPage.value + 1 : 1
    const res = await productApi.getProducts({
      regionId: rid,
      page,
      pageSize: PAGE_SIZE,
      sort: 'createdAt',
      order: 'desc',
    })
    const list = res?.list || []
    if (append) {
      latestProducts.value = [...latestProducts.value, ...list]
      latestPage.value = page
    } else {
      latestProducts.value = list
      latestPage.value = 1
    }
    latestTotal.value = res?.pagination?.total ?? latestProducts.value.length
  } catch (e) {
    if (!append) {
      latestProducts.value = []
      latestError.value = e.message || '加载最新商品失败'
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMoreLatest() {
  fetchLatestProducts(true)
}

onMounted(async () => {
  try {
    const [rid, cfg] = await Promise.all([
      regionId.value || ensureGuestRegion(),
      configApi.getPlatformConfig().catch((err) => {
        console.warn('getPlatformConfig failed', err)
        return { banners: [], announcement: '' }
      }),
    ])
    cachedRegionId.value = rid
    platform.value = cfg
    const [, rec] = await Promise.all([
      fetchLatestProducts(false),
      productApi.getRecommendedProducts({ regionId: rid, limit: 8 }).catch((err) => {
        console.warn('getRecommendedProducts failed', err)
        return { list: [] }
      }),
    ])
    recommendedProducts.value = rec.list || []
  } catch {
    loading.value = false
    loadingMore.value = false
  }
})
</script>

<style scoped>
.announcement { margin-bottom: 16px; }
.banner-carousel { margin-bottom: 20px; border-radius: 8px; overflow: hidden; }
.banner-slide {
  height: 100%;
  background: linear-gradient(135deg, #409eff, #67c23a);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 32px;
  color: #fff;
}
.banner-text h2 { font-size: 22px; margin-bottom: 8px; }
.banner-text p { opacity: 0.9; font-size: 14px; }
.service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.service-card {
  cursor: pointer;
  text-align: center;
  padding: 28px 20px;
  transition: transform 0.2s;
  border-radius: 12px;
}
.service-card:hover { transform: translateY(-2px); }
.service-card--trade { background: linear-gradient(160deg, #ecf5ff, #f0f9ff); }
.service-card--resume-build { background: linear-gradient(160deg, #f0fdf4, #ecfdf5); }
.service-card--delivery { background: linear-gradient(160deg, #fff7ed, #ffedd5); }
.service-icon { font-size: 40px; margin-bottom: 12px; }
.service-card h2 { margin: 0 0 8px; font-size: 20px; color: var(--app-text); }
.service-card p { margin: 0 0 16px; font-size: 14px; color: var(--app-muted); line-height: 1.5; }
.hero { text-align: center; padding: 40px 24px; margin-bottom: 24px; background: linear-gradient(135deg, #e0f2fe, #f0fdf4); }
.hero h1 { font-size: 26px; margin-bottom: 12px; }
.actions { margin-top: 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.load-more-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 0 4px;
  color: var(--app-muted, #909399);
  font-size: 13px;
}
@media (max-width: 1100px) {
  .service-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 960px) {
  .service-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .hero { padding: 32px 16px; }
  .hero h1 { font-size: 22px; }
  .banner-text h2 { font-size: 18px; }
}
</style>
