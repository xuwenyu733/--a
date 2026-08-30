<template>
  <view class="page">
    <view class="search-bar">
      <view class="search-box">
        <text class="search-ico">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          confirm-type="search"
          placeholder="搜索商品、用户名或好友号"
          :focus="autoFocus"
          @confirm="doSearch"
        />
        <text v-if="keyword" class="search-clear" @tap="clearKeyword">清除</text>
      </view>
      <text class="search-btn" @tap="doSearch">搜索</text>
    </view>

    <view v-if="!searched" class="hint muted">输入关键词，可同时搜商品与用户</view>

    <view v-else class="results">
      <!-- 商品 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">商品</text>
          <text v-if="products.length" class="link" @tap="goMarketMore">更多</text>
        </view>
        <view v-if="loadingProducts" class="empty muted">搜索中…</view>
        <view v-else-if="productError" class="empty">{{ productError }}</view>
        <view v-else-if="!products.length" class="empty muted">未找到相关商品</view>
        <view v-else class="grid-wrap">
          <view class="grid-2">
            <view v-for="p in products" :key="p._id" class="grid-2-item">
              <ProductCard :product="p" />
            </view>
          </view>
        </view>
      </view>

      <!-- 用户 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">用户</text>
          <text class="link" @tap="goFriendPage">添加好友</text>
        </view>
        <view v-if="!loggedIn" class="empty muted">登录后可搜索并添加好友</view>
        <view v-else-if="loadingUsers" class="empty muted">搜索中…</view>
        <view v-else-if="userError" class="empty">{{ userError }}</view>
        <view v-else-if="!users.length" class="empty muted">未找到相关用户</view>
        <view v-else>
          <view v-for="item in users" :key="item._id" class="card user-row">
            <view class="avatar" @tap="goProfile(item._id)">{{ (item.nickname || '?')[0] }}</view>
            <view class="user-body" @tap="goProfile(item._id)">
              <text class="name">{{ item.nickname }}</text>
              <text class="muted">
                好友号 {{ item.friendCode || '—' }}
                <text v-if="item.regionId?.name"> · {{ item.regionId.name }}</text>
              </text>
            </view>
            <view class="actions">
              <view v-if="item.relation === 'none'" class="btn primary" @tap="onAdd(item)">添加</view>
              <text v-else-if="item.relation === 'pending_out'" class="status">待通过</text>
              <view
                v-else-if="item.relation === 'pending_in'"
                class="btn primary"
                @tap="onAccept(item)"
              >通过</view>
              <text v-else-if="item.relation === 'friend'" class="status friend">已是好友</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getProducts } from '@/api/product'
import { searchFriends, sendFriendRequest, acceptFriendRequest } from '@/api/friend'
import { isLoggedIn, ensureLogin } from '@/utils/auth'
import { ensureGuestRegion } from '@/utils/region'
import { getFileUrl } from '@/utils/fileUrl'
import ProductCard from '@/components/ProductCard.vue'

const keyword = ref('')
const autoFocus = ref(true)
const searched = ref(false)
const loggedIn = ref(false)

const products = ref([])
const loadingProducts = ref(false)
const productError = ref('')

const users = ref([])
const loadingUsers = ref(false)
const userError = ref('')

let acting = false

onLoad((options) => {
  if (options?.q) {
    keyword.value = decodeURIComponent(options.q)
    autoFocus.value = false
  }
})

onShow(() => {
  loggedIn.value = isLoggedIn()
  if (keyword.value.trim()) doSearch()
})

function clearKeyword() {
  keyword.value = ''
  searched.value = false
  products.value = []
  users.value = []
  productError.value = ''
  userError.value = ''
}

async function doSearch() {
  const q = keyword.value.trim()
  if (!q) {
    uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
    return
  }
  searched.value = true
  loggedIn.value = isLoggedIn()
  await Promise.all([searchProducts(q), searchUsers(q)])
}

async function searchProducts(q) {
  loadingProducts.value = true
  productError.value = ''
  try {
    const regionId = await ensureGuestRegion()
    const res = await getProducts({
      regionId,
      keyword: q,
      page: 1,
      pageSize: 6,
      sort: 'createdAt',
      order: 'desc',
    })
    products.value = (res.list || []).map((p) => ({
      ...p,
      cover: getFileUrl(p.images?.[0]),
    }))
  } catch (e) {
    products.value = []
    productError.value = e.message || '商品搜索失败'
  } finally {
    loadingProducts.value = false
  }
}

async function searchUsers(q) {
  if (!isLoggedIn()) {
    users.value = []
    userError.value = ''
    loadingUsers.value = false
    return
  }
  loadingUsers.value = true
  userError.value = ''
  try {
    const data = await searchFriends({ q, pageSize: 10 })
    users.value = data?.list || []
  } catch (e) {
    users.value = []
    userError.value = e.message || '用户搜索失败'
  } finally {
    loadingUsers.value = false
  }
}

function goMarketMore() {
  const q = keyword.value.trim()
  uni.setStorageSync('market_filter', { keyword: q })
  uni.switchTab({ url: '/pages/products/list' })
}

function goFriendPage() {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/user/friend-search' })
}

function goProfile(id) {
  uni.navigateTo({ url: `/pages/user/profile?id=${id}` })
}

async function onAdd(item) {
  if (acting || !ensureLogin()) return
  acting = true
  try {
    await sendFriendRequest({ userId: item._id })
    item.relation = 'pending_out'
    uni.showToast({ title: '申请已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    acting = false
  }
}

async function onAccept(item) {
  const id = item.friendshipId || item.requestId
  if (!id || acting) return
  acting = true
  try {
    await acceptFriendRequest(id)
    item.relation = 'friend'
    uni.showToast({ title: '已添加好友', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  } finally {
    acting = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20rpx 24rpx 48rpx;
  box-sizing: border-box;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 0 24rpx;
  height: 72rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.search-ico {
  margin-right: 10rpx;
  font-size: 28rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.search-clear {
  font-size: 24rpx;
  color: #909399;
  padding-left: 12rpx;
}

.search-btn {
  font-size: 28rpx;
  color: #409eff;
  font-weight: 600;
  padding: 12rpx 8rpx;
}

.hint {
  text-align: center;
  padding: 80rpx 0;
  font-size: 26rpx;
}

.section {
  margin-bottom: 28rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8rpx 8rpx 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.link {
  font-size: 24rpx;
  color: #409eff;
}

.empty {
  text-align: center;
  padding: 32rpx 0;
  font-size: 26rpx;
  color: #909399;
}

.muted {
  color: #909399;
}

.grid-wrap {
  display: block;
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

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.user-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #67c23a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.user-body {
  flex: 1;
  min-width: 0;
}

.name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.btn {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.btn.primary {
  background: #409eff;
  color: #fff;
}

.status {
  font-size: 24rpx;
  color: #909399;
}

.status.friend {
  color: #67c23a;
}
</style>
