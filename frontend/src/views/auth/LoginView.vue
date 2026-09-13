<template>
  <div class="auth-page" role="main">
    <el-card class="auth-card">
      <h2 id="login-title">登录</h2>
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        aria-labelledby="login-title"
        aria-label="登录表单"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号"
            autocomplete="tel"
            aria-required="true"
            @input="errorTip = ''"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            autocomplete="current-password"
            aria-required="true"
            @input="errorTip = ''"
          />
        </el-form-item>
        <p v-if="errorTip" class="error-tip" role="alert">{{ errorTip }}</p>
        <el-button type="primary" native-type="submit" :loading="loading" style="width:100%">登录</el-button>
      </el-form>
      <p class="tip">还没有账号？<router-link to="/register">立即注册</router-link></p>
      <p class="tip legal-links">
        <router-link to="/terms">用户协议</router-link>
        ·
        <router-link to="/privacy">隐私政策</router-link>
      </p>
      <el-divider>测试账号</el-divider>
      <div class="test-accounts">
        <el-tag @click="fill('13800000000','admin123456')">超管</el-tag>
        <el-tag type="success" @click="fill('13800000001','agent123456')">代理</el-tag>
        <el-tag type="warning" @click="fill('13800000002','merchant123')">商家</el-tag>
        <el-tag type="info" @click="fill('13800000003','student123')">学生</el-tag>
      </div>
    </el-card>
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
const errorTip = ref('')
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
  loading.value = true
  try {
    await auth.login(form.value)
    ElMessage.success('登录成功')
    const redirect = route.query.redirect || auth.homePath
    router.push(redirect)
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
.auth-page { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.auth-card { width: 400px; }
.auth-card h2 { text-align: center; margin-bottom: 24px; }
.error-tip {
  margin: -8px 0 16px;
  padding: 10px 12px;
  color: #cf1322;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.4;
}
.tip { text-align: center; margin-top: 16px; color: #666; }
.test-accounts { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; cursor: pointer; }
</style>
