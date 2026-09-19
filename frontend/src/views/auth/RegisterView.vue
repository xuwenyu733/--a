<template>
  <div class="login-page" role="main">
    <div class="login-bg" aria-hidden="true" />

    <div class="login-card">
      <div class="brand">
        <img class="brand-cap" src="/login/cap.png" alt="" />
        <h1 id="register-title" class="brand-title">校园注册</h1>
        <p class="brand-slogan">— 连接校园 · 发现更好的你 —</p>
      </div>

      <el-form
        ref="formRef"
        class="login-form"
        :model="form"
        :rules="rules"
        aria-labelledby="register-title"
        aria-label="注册表单"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="phone">
          <el-input
            v-model="form.phone"
            class="field"
            size="large"
            placeholder="请输入手机号"
            autocomplete="tel"
            aria-required="true"
          >
            <template #prefix>
              <img class="field-ico" src="/login/phone.png" alt="" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="code">
          <div class="code-row">
            <el-input
              v-model="form.code"
              class="field"
              size="large"
              placeholder="请输入验证码"
              aria-required="true"
            >
              <template #prefix>
                <svg class="field-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M8 8h8M8 12h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </template>
            </el-input>
            <button type="button" class="code-btn" :disabled="countdown > 0" @click="sendSms">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            class="field"
            size="large"
            type="password"
            show-password
            placeholder="请输入密码"
            autocomplete="new-password"
            aria-required="true"
          >
            <template #prefix>
              <img class="field-ico" src="/login/lock.png" alt="" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="nickname">
          <el-input
            v-model="form.nickname"
            class="field"
            size="large"
            placeholder="昵称（选填）"
            autocomplete="nickname"
          >
            <template #prefix>
              <svg class="field-svg" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 19.2c1.4-3 3.6-4.4 6.5-4.4s5.1 1.4 6.5 4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="regionId">
          <el-select
            v-model="form.regionId"
            class="field region-field"
            size="large"
            placeholder="请选择学校/区域"
            aria-required="true"
          >
            <template #prefix>
              <svg class="field-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" fill="none" stroke="currentColor" stroke-width="1.6" />
                <circle cx="12" cy="11" r="1.8" fill="currentColor" />
              </svg>
            </template>
            <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
          </el-select>
        </el-form-item>

        <p v-if="errorTip" class="error-tip" role="alert">{{ errorTip }}</p>

        <div class="agree-row">
          <el-checkbox v-model="form.agreed" @change="onAgreeChange">
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
          注册 →
        </el-button>
      </el-form>

      <p class="tip">已有账号？<router-link to="/login">去登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)
const countdown = ref(0)
const errorTip = ref('')
const regions = ref([])
const form = ref({ phone: '', code: '123456', password: '', nickname: '', regionId: '', agreed: false })
const rules = {
  phone: [{ required: true, message: '请输入手机号' }],
  code: [{ required: true, message: '请输入验证码' }],
  password: [{ required: true, min: 6, message: '密码至少6位' }],
  regionId: [{ required: true, message: '请选择区域' }],
}

onMounted(async () => {
  regions.value = await authApi.getRegions()
  if (regions.value.length) form.value.regionId = regions.value[0]._id
})

function onAgreeChange(checked) {
  if (checked) errorTip.value = ''
}

async function sendSms() {
  if (!form.value.phone) return ElMessage.warning('请先输入手机号')
  await authApi.sendCode(form.value.phone)
  ElMessage.success('验证码已发送（开发环境请填 123456，接口不再返回验证码）')
  countdown.value = 60
  const t = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(t)
  }, 1000)
}

async function handleRegister() {
  errorTip.value = ''
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!form.value.agreed) {
    errorTip.value = '请先阅读并同意用户协议与隐私政策'
    return
  }
  loading.value = true
  try {
    await auth.register(form.value)
    ElMessage.success('注册成功')
    router.push('/')
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
  overflow: auto;
}

.login-bg {
  position: fixed;
  inset: 0;
  background: url('/login/bg.png?v=4') center / cover no-repeat;
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(440px, 100%);
  margin: auto;
  padding: 32px 36px 24px;
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
  margin-bottom: 22px;
  text-align: center;
}

.brand-cap {
  width: 52px;
  height: 52px;
  margin-bottom: 8px;
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
  margin-bottom: 16px;
}

.login-form :deep(.el-form-item__error) {
  padding-top: 4px;
}

.field {
  width: 100%;
}

.field :deep(.el-input__wrapper),
.field :deep(.el-select__wrapper) {
  border-radius: 14px;
  background: #f4f8fc;
  box-shadow: 0 0 0 1px #dce8f5 inset;
  padding-left: 12px;
  min-height: 48px;
}

.field :deep(.el-input__wrapper.is-focus),
.field :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #3a91f7 inset;
  background: #fff;
}

.field-ico {
  width: 18px;
  height: 18px;
  opacity: 0.7;
  display: block;
}

.field-svg {
  width: 18px;
  height: 18px;
  color: #8aa0b8;
  display: block;
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row .field {
  flex: 1;
  min-width: 0;
}

.code-btn {
  flex: none;
  height: 48px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid #dce8f5;
  background: #fff;
  color: #2f7ff0;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.code-btn:hover:not(:disabled) {
  border-color: #3a91f7;
  background: #f4f8fc;
}

.code-btn:disabled {
  color: #a0aec0;
  cursor: not-allowed;
}

.error-tip {
  margin: 0 0 12px;
  padding: 10px 12px;
  color: #cf1322;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.4;
}

.agree-row {
  margin: 0 0 14px;
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

.tip {
  margin: 16px 0 0;
  text-align: center;
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

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px 22px;
    border-radius: 22px;
  }

  .brand-title {
    font-size: 24px;
  }

  .code-btn {
    padding: 0 10px;
  }
}
</style>
