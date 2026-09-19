<template>
  <div class="login-page" role="main">
    <div class="login-bg" aria-hidden="true" />

    <div class="login-card">
      <div class="brand">
        <img class="brand-cap" src="/login/cap.png" alt="" />
        <h1 class="brand-title">校园登录</h1>
        <p class="brand-slogan">— 连接校园 · 发现更好的你 —</p>
      </div>

      <el-form
        ref="formRef"
        class="login-form"
        :model="form"
        :rules="rules"
        aria-label="登录表单"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="phone">
          <el-input
            v-model="form.phone"
            class="field"
            size="large"
            placeholder="请输入手机号"
            autocomplete="tel"
            aria-required="true"
            @input="errorTip = ''"
          >
            <template #prefix>
              <img class="field-ico" src="/login/phone.png" alt="" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            class="field"
            size="large"
            type="password"
            show-password
            placeholder="请输入密码"
            autocomplete="current-password"
            aria-required="true"
            @input="errorTip = ''"
          >
            <template #prefix>
              <img class="field-ico" src="/login/lock.png" alt="" />
            </template>
          </el-input>
        </el-form-item>

        <p v-if="errorTip" class="error-tip" role="alert">{{ errorTip }}</p>

        <div class="agree-row">
          <el-checkbox v-model="agreed" @change="onAgreeChange">
            我已阅读并同意
            <router-link to="/terms" target="_blank" @click.stop>《用户协议》</router-link>
            与
            <router-link to="/privacy" target="_blank" @click.stop>《隐私政策》</router-link>
          </el-checkbox>
        </div>

        <el-button
          class="login-btn"
          type="primary"
          native-type="submit"
          size="large"
          :loading="loading"
        >
          登录 →
        </el-button>
      </el-form>

      <div class="meta-row">
        <p class="tip">
          还没有账号？
          <router-link to="/register">立即注册</router-link>
        </p>
      </div>

      <div v-if="showTestAccounts" class="test-block">
        <div class="test-divider">
          <span>测试账号</span>
        </div>
        <div class="test-accounts">
          <button type="button" class="test-chip admin" @click="fill('13800000000', 'admin123456')">
            <span class="dot" />超管
          </button>
          <button type="button" class="test-chip agent" @click="fill('13800000001', 'agent123456')">
            <span class="dot" />代理
          </button>
          <button type="button" class="test-chip merchant" @click="fill('13800000002', 'merchant123')">
            <span class="dot" />商家
          </button>
          <button type="button" class="test-chip student" @click="fill('13800000003', 'student123')">
            <span class="dot" />学生
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)
const showTestAccounts = import.meta.env.DEV
const errorTip = ref('')
const agreed = ref(false)
const form = ref({ phone: '', password: '' })
const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function fill(phone, password) {
  errorTip.value = ''
  form.value = { phone, password }
}

function onAgreeChange(checked) {
  if (checked && errorTip.value === '请先阅读并同意用户协议与隐私政策') {
    errorTip.value = ''
  }
}

function safeRedirect(raw, fallback) {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  return value
}

function loginErrorMessage(err) {
  const msg = err?.response?.data?.message || err?.message
  if (msg && msg !== 'Network Error' && msg !== '请求失败') return msg
  return '手机号或密码错误'
}

async function handleLogin() {
  errorTip.value = ''
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!agreed.value) {
    errorTip.value = '请先阅读并同意用户协议与隐私政策'
    return
  }
  loading.value = true
  try {
    await auth.login(form.value)
    ElMessage.success('登录成功')
    router.push(safeRedirect(route.query.redirect, auth.homePath))
  } catch (err) {
    const msg = loginErrorMessage(err)
    errorTip.value = msg
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  background: url('/login/bg.png?v=4') center / cover no-repeat;
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(420px, 100%);
  padding: 36px 36px 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow:
    0 24px 60px rgba(40, 110, 190, 0.18),
    0 2px 0 rgba(255, 255, 255, 0.7) inset;
  border: 1px solid rgba(255, 255, 255, 0.75);
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
  text-align: center;
}

.brand-cap {
  width: 56px;
  height: 56px;
  margin-bottom: 10px;
  object-fit: contain;
}

.brand-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #2f7ff0;
  letter-spacing: 2px;
}

.brand-slogan {
  margin: 8px 0 0;
  font-size: 13px;
  color: #8aa0b8;
  letter-spacing: 1px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-form :deep(.el-form-item__error) {
  padding-top: 4px;
}

.field :deep(.el-input__wrapper) {
  border-radius: 14px;
  background: #f4f8fc;
  box-shadow: 0 0 0 1px #dce8f5 inset;
  padding-left: 12px;
  min-height: 48px;
}

.field :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3a91f7 inset;
  background: #fff;
}

.field-ico {
  width: 18px;
  height: 18px;
  opacity: 0.7;
  display: block;
}

.error-tip {
  margin: -4px 0 12px;
  padding: 10px 12px;
  color: #cf1322;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.4;
}

.agree-row {
  margin: 0 0 16px;
}

.agree-row :deep(.el-checkbox) {
  align-items: flex-start;
  height: auto;
  white-space: normal;
}

.agree-row :deep(.el-checkbox__label) {
  font-size: 13px;
  color: #606266;
  line-height: 1.55;
  white-space: normal;
}

.agree-row a {
  color: #3a91f7;
  text-decoration: none;
}

.agree-row a:hover {
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  height: 48px;
  margin-top: 4px;
  border: none;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #4aa3ff 0%, #2f7ff0 100%);
  box-shadow: 0 10px 24px rgba(47, 127, 240, 0.35);
}

.login-btn:hover,
.login-btn:focus {
  background: linear-gradient(90deg, #5aadff 0%, #3a8af5 100%);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.tip {
  margin: 0;
  font-size: 13px;
  color: #8a97a8;
}

.tip a {
  color: #3a91f7;
  text-decoration: none;
}

.tip a:hover {
  text-decoration: underline;
}

.test-block {
  margin-top: 26px;
}

.test-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  color: #a0aec0;
  font-size: 12px;
}

.test-divider::before,
.test-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e6edf5;
}

.test-accounts {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.test-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: #f5f7fa;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.test-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
}

.test-chip .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.test-chip.admin {
  color: #2f7ff0;
  background: #eaf3ff;
  border-color: #d6e8ff;
}
.test-chip.admin .dot { background: #2f7ff0; }

.test-chip.agent {
  color: #18a058;
  background: #e9f8ef;
  border-color: #cfeedd;
}
.test-chip.agent .dot { background: #18a058; }

.test-chip.merchant {
  color: #e6a23c;
  background: #fff6e8;
  border-color: #ffe2b8;
}
.test-chip.merchant .dot { background: #e6a23c; }

.test-chip.student {
  color: #7b61ff;
  background: #f1edff;
  border-color: #ddd4ff;
}
.test-chip.student .dot { background: #7b61ff; }

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px 22px;
    border-radius: 22px;
  }

  .brand-title {
    font-size: 24px;
  }

  .meta-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
