<template>
  <view class="container">
    <ListCardSkeleton v-if="loading && !list.length" :count="4" :show-head="false" />
    <LoadState
      v-else
      :loading="false"
      :error="loadError"
      :has-data="list.length > 0"
      empty-text="暂无发布"
      @retry="load"
    />
    <view v-for="p in list" :key="p._id" class="card item">
      <view class="row" @tap="goDetail(p._id)">
        <image v-if="p.cover" class="thumb" :src="p.cover" mode="aspectFill" lazy-load />
        <view class="info">
          <text class="title">{{ p.title }}</text>
          <text class="price">¥{{ p.price }}</text>
          <text class="muted">{{ statusLabel(p.status) }} · 库存 {{ p.stock ?? 0 }}</text>
        </view>
      </view>
      <view class="actions">
        <button size="mini" @tap="goEdit(p._id)">编辑</button>
        <button v-if="p.status === 'on_sale'" size="mini" @tap="offShelf(p)">下架</button>
      </view>
    </view>
    <button class="fab" type="primary" @tap="goPublish">+ 发布</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMine, updateStatus } from '@/api/product'
import { ensureLogin } from '@/utils/auth'
import { getFileUrl } from '@/utils/fileUrl'
import LoadState from '@/components/LoadState.vue'
import ListCardSkeleton from '@/components/ListCardSkeleton.vue'

const list = ref([])
const loading = ref(false)
const loadError = ref('')

const STATUS = {
  on_sale: '在售',
  sold: '已售出',
  off_shelf: '已下架',
  rejected: '违规下架',
}

onShow(() => {
  if (ensureLogin()) load()
})

function statusLabel(s) {
  return STATUS[s] || s
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getMine({ pageSize: 50 })
    list.value = (res.list || []).map((p) => ({
      ...p,
      cover: getFileUrl(p.images?.[0]),
    }))
  } catch (e) {
    loadError.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}

function goEdit(id) {
  uni.navigateTo({ url: `/pages/products/publish?id=${id}` })
}

function goPublish() {
  uni.navigateTo({ url: '/pages/products/publish' })
}

function offShelf(p) {
  uni.showModal({
    title: '下架商品',
    content: `确定下架「${p.title}」？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await updateStatus(p._id, 'off_shelf')
        uni.showToast({ title: '已下架', icon: 'success' })
        load()
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.item .row { display: flex; gap: 16rpx; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #eef2f7; }
.info .title { display: block; font-size: 28rpx; }
.actions { margin-top: 16rpx; display: flex; gap: 12rpx; }
.fab {
  position: fixed; right: 32rpx; bottom: calc(32rpx + env(safe-area-inset-bottom));
  width: auto; padding: 0 32rpx; border-radius: 999rpx; background: #409eff;
}
</style>
