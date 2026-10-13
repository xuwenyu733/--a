<template>
  <view class="container">
    <LoadState
      v-if="loadError"
      :error="loadError"
      :has-data="false"
      :show-empty="false"
      @retry="refreshAll"
    />

    <view v-if="roleBlocked" class="card result-panel">
      <view class="result-badge is-muted">
        <view class="result-badge-ring is-muted">
          <text class="result-check">!</text>
        </view>
      </view>
      <text class="result-title">暂不可认证</text>
      <text class="result-desc">{{ roleBlocked }}</text>
    </view>

    <view v-else-if="user?.studentVerified" class="card result-panel">
      <view class="result-badge">
        <view class="result-badge-ring">
          <text class="result-check">✓</text>
        </view>
      </view>
      <text class="result-title">已完成学生认证</text>
      <text class="result-desc">校园身份已通过，可发布闲置、购买商品，也可继续申请商家入驻或骑手认证。</text>
      <view class="result-benefits">
        <view v-for="(b, i) in benefits" :key="i" class="result-benefit">
          <text class="result-benefit-dot" />
          <text class="result-benefit-text">{{ b }}</text>
        </view>
      </view>
      <button class="btn-primary" @tap="goPublish">去发布闲置</button>
      <button class="btn-secondary" @tap="goMarket">浏览市集</button>
    </view>

    <view v-else-if="status?.student?.status === 'pending'" class="card result-panel">
      <view class="result-badge is-pending">
        <view class="result-badge-ring is-pending">
          <text class="result-check">…</text>
        </view>
      </view>
      <text class="result-title">认证审核中</text>
      <text class="result-desc">区域代理正在审核你的学生信息，通过后即可发布闲置。请耐心等待，也可随时刷新查看进度。</text>
      <view class="result-meta">
        <text class="result-meta-label">提交时间</text>
        <text class="result-meta-value">{{ submitTime || '—' }}</text>
      </view>
      <button class="btn-primary is-pending" @tap="refreshAll">刷新状态</button>
    </view>

    <view v-else-if="status?.student?.status === 'rejected'" class="card result-panel">
      <view class="result-badge is-danger">
        <view class="result-badge-ring is-danger">
          <text class="result-check">!</text>
        </view>
      </view>
      <text class="result-title">认证未通过</text>
      <text class="result-desc">请根据驳回原因修改下方信息后重新提交。</text>
      <view class="result-meta is-danger">
        <text class="result-meta-label">驳回原因</text>
        <text class="result-meta-value">{{ status.student.rejectReason || '未填写具体原因' }}</text>
      </view>
    </view>

    <view v-else-if="needSyncApproved" class="card result-panel">
      <view class="result-badge">
        <view class="result-badge-ring">
          <text class="result-check">✓</text>
        </view>
      </view>
      <text class="result-title">审核已通过</text>
      <text class="result-desc">请刷新同步认证状态后即可使用完整功能。</text>
      <view class="result-benefits">
        <view v-for="(b, i) in benefits" :key="i" class="result-benefit">
          <text class="result-benefit-dot" />
          <text class="result-benefit-text">{{ b }}</text>
        </view>
      </view>
      <button class="btn-primary" @tap="refreshAll">刷新认证状态</button>
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
const wasVerified = ref(false)
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
  const prevVerified = wasVerified.value
  try {
    const data = await refreshUserAndVerify()
    user.value = data.user
    status.value = data.status
    if (data.verifyError) loadError.value = data.verifyError
    prefillForm()
    const nowVerified = Boolean(user.value?.studentVerified)
    if (nowVerified && !prevVerified) {
      uni.showToast({ title: '认证已生效', icon: 'success' })
    }
    wasVerified.value = nowVerified
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
.result-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx 40rpx;
  text-align: center;
}

.result-badge {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(64, 158, 255, 0.12), rgba(54, 207, 201, 0.18));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}

.result-badge.is-pending {
  background: linear-gradient(145deg, rgba(230, 162, 60, 0.14), rgba(250, 212, 140, 0.22));
}

.result-badge.is-danger {
  background: linear-gradient(145deg, rgba(245, 108, 108, 0.12), rgba(250, 182, 182, 0.2));
}

.result-badge.is-muted {
  background: linear-gradient(145deg, rgba(144, 147, 153, 0.12), rgba(192, 196, 204, 0.2));
}

.result-badge-ring {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 24rpx rgba(64, 158, 255, 0.28);
}

.result-badge-ring.is-pending {
  background: linear-gradient(135deg, #e6a23c, #f3d19e);
  box-shadow: 0 10rpx 24rpx rgba(230, 162, 60, 0.32);
}

.result-badge-ring.is-danger {
  background: linear-gradient(135deg, #f56c6c, #fab6b6);
  box-shadow: 0 10rpx 24rpx rgba(245, 108, 108, 0.28);
}

.result-badge-ring.is-muted {
  background: linear-gradient(135deg, #909399, #c0c4cc);
  box-shadow: 0 10rpx 24rpx rgba(144, 147, 153, 0.28);
}

.result-check {
  color: #fff;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1;
}

.result-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12rpx;
}

.result-desc {
  font-size: 26rpx;
  color: #909399;
  line-height: 1.6;
  margin-bottom: 32rpx;
  padding: 0 8rpx;
}

.result-meta {
  width: 100%;
  background: #fff8ef;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 36rpx;
  box-sizing: border-box;
  text-align: left;
  border: 1rpx solid rgba(230, 162, 60, 0.18);
}

.result-meta.is-danger {
  background: #fff5f5;
  border-color: rgba(245, 108, 108, 0.18);
}

.result-meta-label {
  display: block;
  font-size: 22rpx;
  color: #909399;
  margin-bottom: 8rpx;
}

.result-meta-value {
  display: block;
  font-size: 28rpx;
  color: #303133;
  font-weight: 600;
  line-height: 1.5;
}

.result-benefits {
  width: 100%;
  background: #f5f9ff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 36rpx;
  box-sizing: border-box;
  text-align: left;
}

.result-benefit {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 12rpx;
}
.result-benefit:last-child {
  margin-bottom: 0;
}

.result-benefit-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  margin-top: 12rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.result-benefit-text {
  flex: 1;
  font-size: 26rpx;
  color: #606266;
  line-height: 1.7;
}

.btn-primary,
.btn-secondary {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  margin: 0;
  padding: 0;
}

.btn-primary {
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(64, 158, 255, 0.28);
  margin-bottom: 20rpx;
}

.btn-primary.is-pending {
  background: linear-gradient(135deg, #e6a23c, #f0c78a);
  box-shadow: 0 8rpx 20rpx rgba(230, 162, 60, 0.3);
  margin-bottom: 0;
}

.btn-primary:active {
  opacity: 0.9;
}

.btn-secondary {
  background: #fff;
  color: #409eff;
  border: 2rpx solid rgba(64, 158, 255, 0.45);
}

.btn-secondary:active {
  background: #f0f7ff;
}

.btn-primary::after,
.btn-secondary::after {
  border: none;
}

.intro {
  display: block;
  margin: 12rpx 0;
}
.benefits {
  margin-bottom: 16rpx;
}
.benefit {
  display: block;
  font-size: 26rpx;
  color: #606266;
  line-height: 1.8;
}
button[type='primary'] {
  margin-top: 32rpx;
  background: #409eff;
}
</style>
