<template>
  <div class="product-list-page">
    <el-card class="filter-card">
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="关键词">
          <el-autocomplete
            v-model="filters.keyword"
            :fetch-suggestions="querySearchHistory"
            placeholder="搜索商品"
            clearable
            style="width:220px"
            @select="onSelectHistory"
            @keyup.enter="search"
          />
          <div v-if="searchHistory.length && auth.isLoggedIn" class="history-tags">
            <span class="history-label">最近搜索：</span>
            <el-tag
              v-for="h in searchHistory"
              :key="h._id"
              size="small"
              class="history-tag"
              @click="applyKeyword(h.keyword)"
            >{{ h.keyword }}</el-tag>
            <el-button link size="small" type="danger" @click="clearHistory">清空</el-button>
          </div>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" clearable placeholder="全部" style="width:120px">
            <el-option v-for="c in CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.sellerType" clearable placeholder="全部" style="width:100px">
            <el-option label="个人闲置" value="student" />
            <el-option label="商家" value="merchant" />
          </el-select>
        </el-form-item>
        <el-form-item label="交易方式">
          <el-select v-model="filters.tradeMode" clearable placeholder="全部" style="width:110px">
            <el-option v-for="m in TRADE_MODES" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="filters.groupBuyOnly" @change="search">仅看拼单中</el-checkbox>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="filters.minPrice" :min="0" placeholder="最低" controls-position="right" style="width:100px" />
          <span style="margin:0 4px">-</span>
          <el-input-number v-model="filters.maxPrice" :min="0" placeholder="最高" controls-position="right" style="width:100px" />
        </el-form-item>
        <el-form-item label="排序">
          <el-select v-model="filters.sort" style="width:120px">
            <el-option v-for="s in SORT_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
          <el-select v-model="filters.order" style="width:80px;margin-left:8px">
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button v-if="hasActiveFilter" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-alert
      v-if="filters.groupBuyOnly"
      type="info"
      :closable="false"
      show-icon
      class="filter-hint"
      title="当前仅显示「拼单中」的商品"
    />

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

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

    <ProductGridSkeleton v-if="loading" :count="12" />
    <el-row v-else-if="list.length" :gutter="16">
      <el-col v-for="p in list" :key="p._id" :xs="12" :sm="8" :md="6">
        <ProductCard :product="p" />
      </el-col>
    </el-row>
    <el-empty v-else-if="!loading && !error" :description="emptyDescription">
      <el-button v-if="filters.groupBuyOnly" type="primary" @click="clearGroupBuyFilter">查看全部商品</el-button>
    </el-empty>

    <div class="pagination" v-if="pagination.total > pagination.pageSize">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="pagination.total"
        :page-size="pagination.pageSize"
        v-model:current-page="filters.page"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as productApi from '@/api/product'
import * as userApi from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { useRegion } from '@/composables/useRegion'
import { CATEGORIES, SORT_OPTIONS, TRADE_MODES } from '@/constants/product'
import ProductCard from '@/components/ProductCard.vue'
import ProductGridSkeleton from '@/components/ProductGridSkeleton.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { regionId, ensureGuestRegion } = useRegion()
const loading = ref(false)
const error = ref('')
const searchHistory = ref([])
const list = ref([])
const pagination = ref({ page: 1, pageSize: 12, total: 0 })
const filters = ref({
  keyword: '',
  category: '',
  sellerType: '',
  tradeMode: '',
  minPrice: undefined,
  maxPrice: undefined,
  sort: 'createdAt',
  order: 'desc',
  groupBuyOnly: false,
  page: 1,
})

const hasActiveFilter = computed(
  () =>
    !!filters.value.keyword ||
    !!filters.value.category ||
    !!filters.value.sellerType ||
    !!filters.value.tradeMode ||
    filters.value.minPrice != null ||
    filters.value.maxPrice != null ||
    filters.value.groupBuyOnly
)

const emptyDescription = computed(() => {
  if (filters.value.groupBuyOnly) return '暂无进行中的拼单商品'
  if (hasActiveFilter.value) return '没有符合筛选条件的商品'
  return '暂无商品'
})

function buildQueryParams(regionIdValue) {
  const params = { ...filters.value, regionId: regionIdValue, pageSize: 12 }
  if (!params.category) delete params.category
  if (!params.sellerType) delete params.sellerType
  if (!params.tradeMode) delete params.tradeMode
  if (!params.keyword) delete params.keyword
  if (params.minPrice == null) delete params.minPrice
  if (params.maxPrice == null) delete params.maxPrice
  if (!params.groupBuyOnly) delete params.groupBuyOnly
  else params.groupBuyOnly = true
  return params
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const rid = regionId.value || (await ensureGuestRegion())
    if (!rid) {
      list.value = []
      pagination.value = { page: 1, pageSize: 12, total: 0 }
      ElMessage.warning('未配置校区，请联系管理员')
      return
    }
    const res = await productApi.getProducts(buildQueryParams(rid))
    list.value = res?.list || []
    pagination.value = res?.pagination || { page: 1, pageSize: 12, total: 0 }
  } catch (e) {
    list.value = []
    pagination.value = { page: 1, pageSize: 12, total: 0 }
    error.value = e.message || '加载商品列表失败'
  } finally {
    loading.value = false
  }
}

function search() {
  filters.value.page = 1
  if (auth.isLoggedIn && filters.value.keyword?.trim()) {
    userApi.saveSearchHistory(filters.value.keyword.trim()).catch((err) => {
      console.warn('saveSearchHistory failed', err)
    })
    loadSearchHistory()
  }
  load()
}

function resetFilters() {
  filters.value = {
    keyword: '',
    category: '',
    sellerType: '',
    tradeMode: '',
    minPrice: undefined,
    maxPrice: undefined,
    sort: 'createdAt',
    order: 'desc',
    groupBuyOnly: false,
    page: 1,
  }
  router.replace({ path: '/products', query: {} })
  search()
}

function clearGroupBuyFilter() {
  filters.value.groupBuyOnly = false
  router.replace({ path: '/products', query: {} })
  search()
}

function applyKeyword(kw) {
  filters.value.keyword = kw
  search()
}

function onSelectHistory(item) {
  filters.value.keyword = item.value
  search()
}

function querySearchHistory(query, cb) {
  const items = searchHistory.value
    .filter((h) => !query || h.keyword.includes(query))
    .map((h) => ({ value: h.keyword }))
  cb(items)
}

async function loadSearchHistory() {
  if (!auth.isLoggedIn) return
  try {
    searchHistory.value = await userApi.getSearchHistory()
  } catch {
    searchHistory.value = []
  }
}

async function clearHistory() {
  await userApi.clearSearchHistory()
  searchHistory.value = []
}

onMounted(async () => {
  if (route.query.groupBuy === '1') {
    filters.value.groupBuyOnly = true
  }
  await loadSearchHistory()
  load()
})
</script>

<style scoped>
.filter-card { margin-bottom: 20px; }
.filter-hint { margin-bottom: 16px; }
.history-tags { margin-top: 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.history-label { font-size: 12px; color: #909399; }
.history-tag { cursor: pointer; }
.pagination { margin-top: 24px; display: flex; justify-content: center; }
</style>
