<template>
  <view class="container">
    <LoadState
      v-if="loadError"
      :error="loadError"
      :has-data="false"
      :show-empty="false"
      @retry="refreshAll"
    />

    <view v-if="roleBlocked" class="card tip warning">{{ roleBlocked }}</view>

    <view v-else-if="user?.studentVerified" class="card tip success">
      <text class="tip-title">✓ 已完成学生认证</text>
      <text class="tip-desc">您可以发布闲置、购买商品，也可继续申请商家入驻或骑手认证。</text>
      <view class="cta-row">
        <button size="mini" type="primary" @tap="goPublish">去发布闲置</button>
        <button size="mini" @tap="goMarket">浏览市集</button>
      </view>
    </view>

    <view v-else-if="status?.student?.status === 'pending'" class="card tip warning">
      <text class="tip-title">认证审核中</text>
      <text class="tip-desc">区域代理正在审核，请耐心等待。提交时间：{{ submitTime }}</text>
      <button size="mini" @tap="refreshAll">刷新状态</button>
    </view>

    <view v-else-if="status?.student?.status === 'rejected'" class="card tip danger">
      <text class="tip-title">认证被拒绝</text>
      <text class="tip-desc">原因：{{ status.student.rejectReason || '无' }}。请修改信息后重新提交。</text>
    </view>

    <view v-else-if="needSyncApproved" class="card tip success">
      <text class="tip-title">审核已通过</text>
      <text class="tip-desc">请点击刷新同步认证状态后即可使用完整功能。</text>
      <button size="mini" type="primary" @tap="refreshAll">刷新认证状态</button>
    </view>

    <view v-if="!user?.studentVerified && !roleBlocked && status?.student?.status !== 'pending'" class="card">
      <text class="section-title">学生认证</text>
      <text class="intro muted">完成认证后可解锁以下能力：</text>
      <view class="benefits">
        <text v-for="(b, i) in benefits" :key="i" class="benefit">· {{ b }}</text>
      </view>

      <text class="label">学号 *</text>
      <input class="input" v-model="form.studentId" placeholder="请输入学号" />
      <text class="label">真实姓名 *</text>
      <input class="input" v-model="form.realName" placeholder="与证件一致" />
      <text class="label">入学年份 *</text>
      <input class="input" type="number" v-model="form.enrollYear" placeholder="如 2024" />
      <text class="label">学院</text>
      <input class="input" v-model="form.college" placeholder="选填" />
      <button type="primary" :loading="loading" @tap="submit">提交认证</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { submitStudentVerify } from '@/api/user'
import { ensureLogin } from '@/utils/auth'
import { refreshUserAndVerify, formatVerifyTime } from '@/utils/verify'
import { STUDENT_VERIFY_BENEFITS } from '@/constants/verify'
import LoadState from '@/components/LoadState.vue'

const loading = ref(false)
const loadError = ref('')
const status = ref(null)
const user = ref(null)
const form = ref({ studentId: '', realName: '', enrollYear: '2024', college: '' })
const benefits = STUDENT_VERIFY_BENEFITS

const roleBlocked = computed(() => {
  if (!user.value) return ''
  if (user.value.role === 'merchant') return '您已是商家账号，无需学生认证。'
  if (user.value.role !== 'student') return '当前账号类型不支持学生认证。'
  return ''
})

const needSyncApproved = computed(
  () => status.value?.student?.status === 'approved' && !user.value?.studentVerified
)

const submitTime = computed(() => formatVerifyTime(status.value?.student?.createdAt))

onShow(refreshAll)

async function refreshAll() {
  if (!ensureLogin()) return
  loadError.value = ''
  try {
    const data = await refreshUserAndVerify()
    user.value = data.user
    status.value = data.status
    if (data.verifyError) loadError.value = data.verifyError
    prefillForm()
    if (user.value?.studentVerified) {
      uni.showToast({ title: '认证已生效', icon: 'success' })
    }
  } catch (e) {
    loadError.value = e.message || '加载失败'
  }
}

function prefillForm() {
  const payload = status.value?.student?.payload
  if (!payload || status.value?.student?.status === 'pending') return
  form.value = {
    studentId: payload.studentId || form.value.studentId,
    realName: payload.realName || form.value.realName,
    enrollYear: String(payload.enrollYear || form.value.enrollYear),
    college: payload.college || form.value.college,
  }
}

async function submit() {
  if (!form.value.studentId?.trim() || !form.value.realName?.trim()) {
    uni.showToast({ title: '请填写学号和姓名', icon: 'none' })
    return
  }
  const enrollYear = Number(form.value.enrollYear)
  if (!enrollYear || enrollYear < 2015 || enrollYear > 2030) {
    uni.showToast({ title: '请填写有效入学年份', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await submitStudentVerify({
      ...form.value,
      enrollYear,
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

function goMarket() {
  uni.switchTab({ url: '/pages/products/list' })
}
</script>

<style lang="scss" scoped>
.tip { font-size: 28rpx; line-height: 1.5; margin-bottom: 24rpx; display: flex; flex-direction: column; }
.tip.success { background: #f0f9eb; color: #67c23a; }
.tip.warning { background: #fdf6ec; color: #e6a23c; }
.tip.danger { background: #fef0f0; color: #f56c6c; }
.tip-title { font-weight: 600; font-size: 30rpx; margin-bottom: 8rpx; }
.tip-desc { font-size: 26rpx; opacity: 0.95; margin-bottom: 8rpx; }
.cta-row { display: flex; flex-direction: row; margin-top: 8rpx; }
.cta-row button { margin-right: 16rpx; }
.intro { display: block; margin: 12rpx 0; }
.benefits { margin-bottom: 16rpx; }
.benefit { display: block; font-size: 26rpx; color: #606266; line-height: 1.8; }
button[type='primary'] { margin-top: 32rpx; background: #409eff; }
</style>
