<template>
  <el-card header="平台配置">
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-form label-width="100px" v-loading="loading">
      <el-form-item label="公告">
        <el-input v-model="form.announcement" type="textarea" :rows="2" placeholder="首页顶部公告" />
      </el-form-item>
      <el-divider>首页轮播</el-divider>
      <div v-for="(b, i) in form.banners" :key="i" class="banner-row">
        <el-input v-model="b.title" placeholder="标题" style="margin-bottom:8px" />
        <el-input v-model="b.subtitle" placeholder="副标题" style="margin-bottom:8px" />
        <el-input v-model="b.link" placeholder="跳转链接，如 /products" />
        <el-button v-if="form.banners.length > 1" type="danger" link @click="form.banners.splice(i, 1)">删除</el-button>
      </div>
      <el-button v-if="form.banners.length < 5" @click="addBanner">添加轮播</el-button>
      <el-form-item style="margin-top:24px">
        <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as configApi from '@/api/config'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const form = ref({ announcement: '', banners: [] })

function addBanner() {
  form.value.banners.push({ title: '', subtitle: '', image: '', link: '/products' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await configApi.getPlatformConfig()
    form.value = {
      announcement: data.announcement || '',
      banners: data.banners?.length ? [...data.banners] : [{ title: '', subtitle: '', link: '/products' }],
    }
  } catch (e) {
    error.value = e.message || '加载配置失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await configApi.updatePlatformConfig(form.value)
    ElMessage.success('配置已保存')
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.banner-row {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  max-width: 560px;
}
</style>
