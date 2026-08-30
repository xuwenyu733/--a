<template>
  <el-card>
    <template #header>学生认证</template>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="loadStatus">重试</el-button>
    </el-alert>
    <el-alert v-if="auth.user?.studentVerified" title="您已完成学生认证" type="success" show-icon />
    <el-alert v-else-if="status?.student?.status === 'pending'" title="认证审核中，请耐心等待" type="warning" show-icon />
    <el-alert v-else-if="status?.student?.status === 'rejected'" :title="`认证被拒绝：${status.student.rejectReason}`" type="error" show-icon />
    <el-form v-if="!auth.user?.studentVerified && status?.student?.status !== 'pending'" :model="form" label-width="100px" style="max-width:480px;margin-top:20px">
      <el-form-item label="学号"><el-input v-model="form.studentId" /></el-form-item>
      <el-form-item label="真实姓名"><el-input v-model="form.realName" /></el-form-item>
      <el-form-item label="入学年份"><el-input-number v-model="form.enrollYear" :min="2015" :max="2030" /></el-form-item>
      <el-form-item label="学院"><el-input v-model="form.college" /></el-form-item>
      <el-button type="primary" :loading="loading" @click="submit">提交认证</el-button>
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
const form = ref({ studentId: '', realName: '', enrollYear: 2024, college: '' })

async function loadStatus() {
  loadError.value = ''
  try {
    status.value = await userApi.getVerifyStatus()
  } catch (e) {
    loadError.value = e.message || '加载认证状态失败'
  }
}

onMounted(loadStatus)

async function submit() {
  loading.value = true
  try {
    await userApi.submitStudentVerify(form.value)
    ElMessage.success('已提交，等待区域代理审核')
    status.value = await userApi.getVerifyStatus()
    await auth.fetchMe()
  } finally {
    loading.value = false
  }
}
</script>
