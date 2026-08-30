<template>
  <view class="container">
    <LoadState
      v-if="loadError"
      :error="loadError"
      :has-data="false"
      :show-empty="false"
      @retry="refreshAll"
    />

    <view v-if="user?.role === 'merchant'" class="card tip success">
      <text class="tip-title">✓ 您已是认证商家</text>
      <text class="tip-desc">可在 Web 端或后续版本管理店铺商品与订单。</text>
      <button size="mini" type="primary" @tap="goPublish">发布商品</button>
    </view>

    <view v-else-if="roleBlocked" class="card tip warning">{{ roleBlocked }}</view>

    <view v-else-if="status?.merchant?.status === 'pending'" class="card tip warning">
      <text class="tip-title">入驻审核中</text>
      <text class="tip-desc">区域代理正在审核您的商家入驻申请。提交时间：{{ submitTime }}</text>
      <button size="mini" @tap="refreshAll">刷新状态</button>
    </view>

    <view v-else-if="status?.merchant?.status === 'rejected'" class="card tip danger">
      <text class="tip-title">申请被拒绝</text>
      <text class="tip-desc">原因：{{ status.merchant.rejectReason || '无' }}。请修改后重新提交。</text>
    </view>

    <view v-else-if="needSyncApproved" class="card tip success">
      <text class="tip-title">审核已通过</text>
      <text class="tip-desc">请点击刷新同步商家身份。</text>
      <button size="mini" type="primary" @tap="refreshAll">刷新身份</button>
    </view>

    <view v-if="showForm" class="card">
      <text class="section-title">商家入驻</text>
      <text class="intro muted">仅学生账号可申请，审核通过后角色将变为商家：</text>
      <view class="benefits">
        <text v-for="(b, i) in benefits" :key="i" class="benefit">· {{ b }}</text>
      </view>

      <text class="label">店铺名称 *</text>
      <input class="input" v-model="form.shopName" placeholder="如：校园数码小店" />
      <text class="label">营业执照号</text>
      <input class="input" v-model="form.businessLicense" placeholder="选填" />
      <text class="label">联系电话</text>
      <input class="input" type="number" v-model="form.contactPhone" :placeholder="user?.phone || '默认使用注册手机号'" />
      <text class="label">店铺地址</text>
      <input class="input" v-model="form.address" placeholder="如：东区商业街 12 号" />
      <text class="label">店铺简介</text>
      <textarea class="textarea" v-model="form.description" placeholder="介绍您的店铺与主营品类" />
      <button type="primary" :loading="loading" @tap="submit">提交申请</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { submitMerchantVerify } from '@/api/user'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify, formatVerifyTime } from '@/utils/verify'
import { MERCHANT_VERIFY_BENEFITS } from '@/constants/verify'
import LoadState from '@/components/LoadState.vue'

const loading = ref(false)
const loadError = ref('')
const status = ref(null)
const user = ref(null)
const form = ref({ shopName: '', businessLicense: '', contactPhone: '', address: '', description: '' })
const benefits = MERCHANT_VERIFY_BENEFITS

const roleBlocked = computed(() => {
  if (user.value?.role !== 'student') return '仅学生账号可申请商家入驻。'
  if (!user.value?.studentVerified) return '请先完成学生认证，再申请商家入驻。'
  return ''
})

const needSyncApproved = computed(
  () => status.value?.merchant?.status === 'approved' && user.value?.role !== 'merchant'
)

const showForm = computed(
  () =>
    user.value?.role === 'student' &&
    user.value?.studentVerified &&
    status.value?.merchant?.status !== 'pending' &&
    user.value?.role !== 'merchant'
)

const submitTime = computed(() => formatVerifyTime(status.value?.merchant?.createdAt))

onShow(refreshAll)

async function refreshAll() {
  if (!ensureLogin()) return
  loadError.value = ''
  try {
    const data = await refreshUserAndVerify()
    user.value = data.user
    status.value = data.status
    if (data.verifyError) loadError.value = data.verifyError
    if (!form.value.contactPhone) form.value.contactPhone = user.value?.phone || ''
    prefillForm()
    if (user.value?.role === 'merchant') {
      uni.showToast({ title: '商家身份已生效', icon: 'success' })
    }
  } catch (e) {
    loadError.value = e.message || '加载失败'
  }
}

function prefillForm() {
  const payload = status.value?.merchant?.payload
  if (!payload || status.value?.merchant?.status === 'pending') return
  form.value = {
    shopName: payload.shopName || '',
    businessLicense: payload.businessLicense || '',
    contactPhone: payload.contactPhone || user.value?.phone || '',
    address: payload.address || '',
    description: payload.description || '',
  }
}

async function submit() {
  if (!form.value.shopName?.trim()) {
    uni.showToast({ title: '请填写店铺名称', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await submitMerchantVerify({
      ...form.value,
      contactPhone: form.value.contactPhone?.trim() || user.value?.phone,
    })
    uni.showToast({ title: '已提交，等待审核', icon: 'success' })
    await refreshAll()
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goPublish() {
  uni.navigateTo({ url: '/pages/products/publish' })
}
</script>

<style lang="scss" scoped>
.tip { font-size: 28rpx; line-height: 1.5; margin-bottom: 24rpx; display: flex; flex-direction: column; }
.tip.success { background: #f0f9eb; color: #67c23a; }
.tip.warning { background: #fdf6ec; color: #e6a23c; }
.tip.danger { background: #fef0f0; color: #f56c6c; }
.tip-title { font-weight: 600; font-size: 30rpx; margin-bottom: 8rpx; }
.tip-desc { font-size: 26rpx; }
.intro { display: block; margin: 12rpx 0; }
.benefits { margin-bottom: 16rpx; }
.benefit { display: block; font-size: 26rpx; color: #606266; line-height: 1.8; }
button[type='primary'] { margin-top: 32rpx; background: #409eff; }
</style>
