<template>
  <div class="auth-page" role="main">
    <el-card class="auth-card">
      <h2 id="register-title">注册</h2>
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="80px"
        aria-labelledby="register-title"
        aria-label="注册表单"
      >
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" autocomplete="tel" aria-required="true" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="form.code" placeholder="开发环境: 123456" />
            <el-button @click="sendSms" :disabled="countdown > 0">{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="所属区域" prop="regionId">
          <el-select v-model="form.regionId" placeholder="请选择学校/区域" style="width:100%">
            <el-option v-for="r in regions" :key="r._id" :label="r.name" :value="r._id" />
          </el-select>
        </el-form-item>
        <el-form-item prop="agreed">
          <el-checkbox v-model="form.agreed">
            我已阅读并同意
            <router-link to="/terms" target="_blank" @click.stop>用户协议</router-link>
            与
            <router-link to="/privacy" target="_blank" @click.stop>隐私政策</router-link>
          </el-checkbox>
        </el-form-item>
        <el-button type="primary" :loading="loading" style="width:100%" @click="handleRegister">注册</el-button>
      </el-form>
      <p class="tip">已有账号？<router-link to="/login">去登录</router-link></p>
    </el-card>
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
const regions = ref([])
const form = ref({ phone: '', code: '123456', password: '', nickname: '', regionId: '', agreed: false })
const rules = {
  phone: [{ required: true, message: '请输入手机号' }],
  code: [{ required: true, message: '请输入验证码' }],
  password: [{ required: true, min: 6, message: '密码至少6位' }],
  regionId: [{ required: true, message: '请选择区域' }],
  agreed: [
    {
      validator: (_r, v, cb) => (v ? cb() : cb(new Error('请先阅读并同意用户协议与隐私政策'))),
      trigger: 'change',
    },
  ],
}

onMounted(async () => {
  regions.value = await authApi.getRegions()
  if (regions.value.length) form.value.regionId = regions.value[0]._id
})

async function sendSms() {
  if (!form.value.phone) return ElMessage.warning('请先输入手机号')
  await authApi.sendCode(form.value.phone)
  ElMessage.success('验证码已发送（开发模式: 123456）')
  countdown.value = 60
  const t = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(t)
  }, 1000)
}

async function handleRegister() {
  await formRef.value.validate()
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
.auth-page { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
.auth-card { width: 440px; }
.auth-card h2 { text-align: center; margin-bottom: 24px; }
.code-row { display: flex; gap: 8px; width: 100%; }
.tip { text-align: center; margin-top: 16px; }
</style>
