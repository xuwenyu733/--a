<template>
  <el-card>
    <template #header>商家入驻申请</template>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="loadStatus">重试</el-button>
    </el-alert>
    <el-alert v-if="auth.user?.role === 'merchant'" title="您已是认证商家" type="success" show-icon />
    <el-alert v-else-if="status?.merchant?.status === 'pending'" title="入驻审核中" type="warning" show-icon />
    <el-form v-else :model="form" label-width="100px" style="max-width:520px;margin-top:20px">
      <el-form-item label="店铺名称"><el-input v-model="form.shopName" /></el-form-item>
      <el-form-item label="营业执照"><el-input v-model="form.businessLicense" /></el-form-item>
      <el-form-item label="联系电话"><el-input v-model="form.contactPhone" /></el-form-item>
      <el-form-item label="店铺地址"><el-input v-model="form.address" /></el-form-item>
      <el-form-item label="店铺简介"><el-input v-model="form.description" type="textarea" /></el-form-item>
      <el-button type="primary" :loading="loading" @click="submit">提交申请</el-button>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import * as userApi from '@/api/user'

const auth = useAuthStore()
const loading = ref(false)
const loadError = ref('')
const status = ref(null)
const form = ref({ shopName: '', businessLicense: '', contactPhone: '', address: '', description: '' })

async function loadStatus() {
  loadError.value = ''
  try {
    status.value = await userApi.getVerifyStatus()
  } catch (e) {
    loadError.value = e.message || '加载申请状态失败'
  }
}

onMounted(loadStatus)

async function submit() {
  loading.value = true
  try {
    await userApi.submitMerchantVerify(form.value)
    ElMessage.success('已提交，等待区域代理审核')
    status.value = await userApi.getVerifyStatus()
  } finally {
    loading.value = false
  }
}
</script>
