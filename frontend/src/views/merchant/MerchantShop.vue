<template>
  <el-card v-loading="loading">
    <template #header>店铺设置</template>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-form v-if="shop" :model="form" label-width="100px" style="max-width:520px">
      <el-form-item label="店铺名称"><el-input v-model="form.shopName" /></el-form-item>
      <el-form-item label="联系电话"><el-input v-model="form.contactPhone" /></el-form-item>
      <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
      <el-form-item label="简介"><el-input v-model="form.description" type="textarea" /></el-form-item>
      <el-button type="primary" @click="save">保存</el-button>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const shop = ref(null)
const form = ref({})
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    shop.value = await request.get('/merchant/shop')
    form.value = { ...shop.value }
  } catch (e) {
    error.value = e.message || '加载店铺信息失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  await request.put('/merchant/shop', form.value)
  ElMessage.success('保存成功')
}
</script>
