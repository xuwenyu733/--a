<template>
  <view class="container">
    <LoadState
      v-if="productId && (detailLoading || loadError)"
      :loading="detailLoading"
      :error="loadError"
      :has-data="detailLoaded"
      :show-empty="false"
      @retry="() => loadDetail(productId)"
    />

    <view v-else-if="!canPublish" class="card tip">
      <text>发布闲置需先完成学生认证（商家账号可直接发布）。</text>
      <button size="mini" type="primary" @tap="goVerify">去学生认证</button>
    </view>
    <view v-else class="card">
      <text class="label">标题 *</text>
      <input class="input" v-model="form.title" maxlength="80" placeholder="简要描述商品" />

      <text class="label">分类 *</text>
      <picker :range="categoryLabels" @change="onCategory">
        <view class="picker">{{ categoryLabels[categoryIndex] || '请选择' }}</view>
      </picker>

      <text class="label">价格 *</text>
      <input class="input" type="digit" v-model="form.price" placeholder="0" />

      <text class="label">库存 *</text>
      <input class="input" type="number" v-model="form.stock" placeholder="默认 1" />

      <text class="label">成色</text>
      <picker :range="conditionLabels" @change="onCondition">
        <view class="picker">{{ conditionLabels[conditionIndex] }}</view>
      </picker>

      <text class="label">交易地点</text>
      <input class="input" v-model="form.location" placeholder="如：东区宿舍楼下" />

      <text class="label">商品图片（最多 9 张）</text>
      <view class="img-grid">
        <view v-for="(img, i) in imageUrls" :key="img" class="img-item">
          <image :src="img" mode="aspectFill" class="thumb" />
          <text class="del" @tap="removeImage(i)">×</text>
        </view>
        <view v-if="form.images.length < 9" class="img-add" @tap="chooseImages">+</view>
      </view>

      <text class="label">展示视频（选填，1 个）</text>
      <view v-if="videoPreview" class="video-preview">
        <video :src="videoPreview" class="video-player" controls />
        <text class="del" @tap="removeVideo">×</text>
      </view>
      <view v-else class="video-add" @tap="chooseVideo">
        <text class="video-add-icon">+</text>
        <text class="video-add-text">上传短视频</text>
        <text class="video-add-hint">最长 30 秒</text>
      </view>

      <text class="label">描述</text>
      <textarea class="textarea" v-model="form.description" placeholder="详细说明成色、配件等" />

      <button type="primary" :loading="submitting" @tap="submit">发布</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { create, update, getDetail } from '@/api/product'
import { uploadProductImage } from '@/utils/upload'
import { getFileUrl } from '@/utils/fileUrl'
import { ensureLogin, getUser, isLoggedIn, saveSession, getAccessToken, getRefreshToken } from '@/utils/auth'
import { getMe } from '@/api/auth'
import { CATEGORIES, CONDITIONS } from '@/constants/product'
import LoadState from '@/components/LoadState.vue'

const productId = ref('')
const submitting = ref(false)
const uploading = ref(false)
const detailLoading = ref(false)
const detailLoaded = ref(false)
const loadError = ref('')
const canPublish = ref(true)

const form = ref({
  title: '',
  category: 'other',
  price: '',
  stock: '1',
  condition: 'good',
  location: '',
  description: '',
  images: [],
  video: '',
})

const categoryIndex = ref(4)
const conditionIndex = ref(2)
const categoryLabels = CATEGORIES.map((c) => c.label)
const conditionLabels = CONDITIONS.map((c) => c.label)

const videoFile = ref('')
const videoPreview = computed(() => videoFile.value || getFileUrl(form.value.video))
const imageUrls = computed(() => form.value.images.map(getFileUrl))

onLoad((options) => {
  if (!ensureLogin()) return
  if (options.id) {
    productId.value = options.id
    uni.setNavigationBarTitle({ title: '编辑商品' })
    loadDetail(options.id)
  }
})

onShow(checkPublishAccess)

async function checkPublishAccess() {
  if (!isLoggedIn()) return
  try {
    const data = await getMe()
    if (data?.user) {
      saveSession({ user: data.user, accessToken: getAccessToken(), refreshToken: getRefreshToken() })
    }
  } catch { /* use cached user */ }
  const user = getUser()
  canPublish.value = user?.role === 'merchant' || (user?.role === 'student' && user?.studentVerified)
}

function goVerify() {
  uni.navigateTo({ url: '/pages/user/verify-student' })
}

async function loadDetail(id) {
  detailLoading.value = true
  loadError.value = ''
  detailLoaded.value = false
  try {
    const data = await getDetail(id)
    const p = data.product || data
    form.value = {
      title: p.title,
      category: p.category,
      price: String(p.price ?? 0),
      stock: String(Math.max(1, Number(p.stock) || 1)),
      condition: p.condition,
      location: p.location || '',
      description: p.description || '',
      images: [...(p.images || [])],
      video: p.video || '',
    }
    categoryIndex.value = Math.max(0, CATEGORIES.findIndex((c) => c.value === p.category))
    conditionIndex.value = Math.max(0, CONDITIONS.findIndex((c) => c.value === p.condition))
    detailLoaded.value = true
  } catch (e) {
    loadError.value = e.message || '加载商品失败'
  } finally {
    detailLoading.value = false
  }
}

function onCategory(e) {
  categoryIndex.value = Number(e.detail.value)
  form.value.category = CATEGORIES[categoryIndex.value].value
}

function onCondition(e) {
  conditionIndex.value = Number(e.detail.value)
  form.value.condition = CONDITIONS[conditionIndex.value].value
}

function chooseImages() {
  const remain = 9 - form.value.images.length
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uploading.value = true
      try {
        for (const path of res.tempFilePaths) {
          const data = await uploadProductImage(path)
          const stored = data.paths?.[0] ?? data.urls?.[0]
          if (stored) form.value.images.push(stored)
        }
      } catch (e) {
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}

function removeImage(i) {
  form.value.images.splice(i, 1)
}

function chooseVideo() {
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    maxDuration: 30,
    compressed: true,
    success: async (res) => {
      uploading.value = true
      try {
        const data = await uploadProductImage(res.tempFilePath)
        const stored = data.paths?.[0] ?? data.urls?.[0]
        if (stored) {
          form.value.video = stored
          videoFile.value = res.tempFilePath
        }
      } catch (e) {
        uni.showToast({ title: e.message || '视频上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}

function removeVideo() {
  form.value.video = ''
  videoFile.value = ''
}

async function submit() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请填写标题', icon: 'none' })
    return
  }
  const price = Number(form.value.price)
  if (Number.isNaN(price) || price < 0) {
    uni.showToast({ title: '请填写有效价格', icon: 'none' })
    return
  }
  const stock = Math.floor(Number(form.value.stock))
  if (!Number.isInteger(stock) || stock < 1) {
    uni.showToast({ title: '库存至少为 1', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      title: form.value.title.trim(),
      category: form.value.category,
      price,
      stock,
      condition: form.value.condition,
      location: form.value.location.trim(),
      description: form.value.description.trim(),
      images: form.value.images,
      video: form.value.video || undefined,
    }
    if (productId.value) {
      await update(productId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await create(payload)
      uni.showToast({ title: '发布成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.img-grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 12rpx; }
.img-item { position: relative; width: 160rpx; height: 160rpx; }
.thumb { width: 160rpx; height: 160rpx; border-radius: 12rpx; }
.del {
  position: absolute; top: -8rpx; right: -8rpx; width: 36rpx; height: 36rpx;
  background: #f56c6c; color: #fff; border-radius: 50%; text-align: center; line-height: 36rpx;
}
.img-add {
  width: 160rpx; height: 160rpx; border: 2rpx dashed #dcdfe6; border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: #909399;
}
.video-preview {
  position: relative;
  width: 100%;
  margin-top: 12rpx;
}
.video-player {
  width: 100%;
  height: 360rpx;
  border-radius: 12rpx;
  background: #000;
}
.video-add {
  width: 100%;
  height: 200rpx;
  border: 2rpx dashed #dcdfe6;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
  gap: 8rpx;
}
.video-add:active { background: #f5f7fa; }
.video-add-icon { font-size: 48rpx; color: #909399; }
.video-add-text { font-size: 26rpx; color: #409eff; }
.video-add-hint { font-size: 22rpx; color: #c0c4cc; }

button[type='primary'] { margin-top: 32rpx; background: #409eff; }
.tip { background: #fdf6ec; color: #e6a23c; font-size: 28rpx; line-height: 1.5; display: flex; flex-direction: column; gap: 16rpx; }
</style>
