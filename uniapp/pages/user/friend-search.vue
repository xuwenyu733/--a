<template>
  <view class="page">
    <view class="search-bar">
      <view class="search-box">
        <text class="search-ico">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          confirm-type="search"
          placeholder="搜索好友号或用户名"
          :focus="autoFocus"
          @confirm="doSearch"
        />
        <text v-if="keyword" class="search-clear" @tap="clearKeyword">清除</text>
      </view>
      <text class="search-btn" @tap="doSearch">搜索</text>
    </view>

    <view v-if="requests.length" class="section">
      <text class="section-title">好友申请</text>
      <view v-for="item in requests" :key="item.requestId" class="card user-row">
        <view class="avatar" @tap="goProfile(item._id)">{{ (item.nickname || '?')[0] }}</view>
        <view class="user-body" @tap="goProfile(item._id)">
          <text class="name">{{ item.nickname }}</text>
          <text class="muted">好友号 {{ item.friendCode || '—' }}</text>
        </view>
        <view class="actions">
          <view class="btn ghost" @tap="onReject(item)">拒绝</view>
          <view class="btn primary" @tap="onAccept(item)">通过</view>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">{{ searched ? '搜索结果' : '提示' }}</text>
      <view v-if="loading" class="empty muted">搜索中…</view>
      <view v-else-if="loadError" class="empty">
        <text>{{ loadError }}</text>
        <text class="link" @tap="doSearch">重试</text>
      </view>
      <view v-else-if="searched && !results.length" class="empty muted">未找到相关用户</view>
      <view v-else-if="!searched" class="empty muted">输入好友号（精确）或用户名（模糊）开始搜索</view>
      <view v-else>
        <view v-for="item in results" :key="item._id" class="card user-row">
          <view class="avatar" @tap="goProfile(item._id)">{{ (item.nickname || '?')[0] }}</view>
          <view class="user-body" @tap="goProfile(item._id)">
            <text class="name">{{ item.nickname }}</text>
            <text class="muted">
              好友号 {{ item.friendCode || '—' }}
              <text v-if="item.regionId?.name"> · {{ item.regionId.name }}</text>
            </text>
          </view>
          <view class="actions">
            <view
              v-if="item.relation === 'none'"
              class="btn primary"
              @tap="onAdd(item)"
            >添加</view>
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
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  searchFriends,
  listFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from '@/api/friend'
import { ensureLogin, promptLogin } from '@/utils/auth'
import { getFileUrl } from '@/utils/fileUrl'

const keyword = ref('')
const autoFocus = ref(false)
const results = ref([])
const requests = ref([])
const loading = ref(false)
const loadError = ref('')
const searched = ref(false)
let acting = false

onLoad((options) => {
  if (options?.q) {
    keyword.value = decodeURIComponent(options.q)
    autoFocus.value = false
  } else {
    autoFocus.value = true
  }
})

onShow(async () => {
  if (!(await promptLogin({ content: '登录后即可搜索并添加好友' }))) return
  await loadRequests()
  if (keyword.value.trim()) doSearch()
})

async function loadRequests() {
  try {
    const data = await listFriendRequests()
    requests.value = data?.list || []
  } catch {
    requests.value = []
  }
}

function clearKeyword() {
  keyword.value = ''
  results.value = []
  searched.value = false
  loadError.value = ''
}

async function doSearch() {
  if (!ensureLogin()) return
  const q = keyword.value.trim()
  if (!q) {
    uni.showToast({ title: '请输入好友号或用户名', icon: 'none' })
    return
  }
  loading.value = true
  loadError.value = ''
  searched.value = true
  try {
    const data = await searchFriends({ q, pageSize: 30 })
    results.value = (data?.list || []).map((u) => ({
      ...u,
      avatarUrl: getFileUrl(u.avatar),
    }))
  } catch (e) {
    results.value = []
    loadError.value = e.message || '搜索失败'
  } finally {
    loading.value = false
  }
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
  const id = item.requestId || item.friendshipId
  if (!id || acting) return
  acting = true
  try {
    await acceptFriendRequest(id)
    uni.showToast({ title: '已添加好友', icon: 'success' })
    await loadRequests()
    if (searched.value) await doSearch()
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  } finally {
    acting = false
  }
}

async function onReject(item) {
  if (!item.requestId || acting) return
  acting = true
  try {
    await rejectFriendRequest(item.requestId)
    uni.showToast({ title: '已拒绝', icon: 'none' })
    await loadRequests()
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
  margin-bottom: 20rpx;
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

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.section {
  margin-top: 12rpx;
}

.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #909399;
  margin: 8rpx 8rpx 16rpx;
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

.muted {
  color: #909399;
  font-size: 24rpx;
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

.btn.ghost {
  background: #f5f7fa;
  color: #606266;
}

.status {
  font-size: 24rpx;
  color: #909399;
}

.status.friend {
  color: #67c23a;
}

.empty {
  text-align: center;
  padding: 48rpx 0;
  color: #909399;
  font-size: 26rpx;
}

.link {
  display: block;
  margin-top: 12rpx;
  color: #409eff;
}
</style>
