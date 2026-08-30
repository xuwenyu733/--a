<template>
  <el-card class="form-page">
    <template #header>{{ isEdit ? '编辑商品' : '发布商品' }}</template>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" style="margin-bottom: 16px">
      <el-button link type="primary" @click="loadProduct">重试</el-button>
    </el-alert>
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" style="max-width:640px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="80" show-word-limit />
      </el-form-item>
      <el-form-item label="交易方式" prop="tradeMode">
        <el-radio-group v-model="form.tradeMode">
          <el-radio v-for="m in TRADE_MODES" :key="m.value" :value="m.value">{{ m.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select v-model="form.category" style="width:100%">
          <el-option v-for="c in CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>
      <el-form-item :label="form.tradeMode === 'exchange' ? '参考价（可填 0）' : '价格'" prop="price">
        <el-input-number v-model="form.price" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="原价">
        <el-input-number v-model="form.originalPrice" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="成色" prop="condition">
        <el-radio-group v-model="form.condition">
          <el-radio v-for="c in CONDITIONS" :key="c.value" :value="c.value">{{ c.label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="交易地点">
        <el-input v-model="form.location" placeholder="如：东区宿舍楼下" />
      </el-form-item>
      <el-form-item label="商品图片">
        <el-upload
          list-type="picture-card"
          :file-list="fileList"
          :http-request="handleUpload"
          :on-remove="handleRemove"
          accept="image/*"
          :limit="9"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
      </el-form-item>
      <el-form-item label="商品视频">
        <p class="field-hint">可选，最多 1 个，MP4/WebM/MOV，≤20MB</p>
        <el-upload
          v-if="!form.videos.length"
          :show-file-list="false"
          accept="video/mp4,video/webm,video/quicktime"
          :http-request="handleVideoUpload"
        >
          <el-button type="primary" plain>上传视频</el-button>
        </el-upload>
        <div v-else class="video-preview">
          <video :src="videoPreviewUrl" controls class="preview-video" />
          <el-button type="danger" link @click="removeVideo">删除视频</el-button>
        </div>
      </el-form-item>
      <el-form-item v-if="form.tradeMode === 'sell'" label="开启拼单">
        <el-switch v-model="form.groupBuy.enabled" />
        <p class="field-hint">满指定人数后，参与者可按拼单价下单</p>
      </el-form-item>
      <template v-if="form.tradeMode === 'sell' && form.groupBuy.enabled">
        <el-form-item label="成团人数">
          <el-input-number v-model="form.groupBuy.minCount" :min="2" :max="20" />
        </el-form-item>
        <el-form-item label="拼单价">
          <el-input-number v-model="form.groupBuy.groupPrice" :min="0" :precision="2" />
        </el-form-item>
      </template>
      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="5" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit">{{ isEdit ? '保存' : '发布' }}</el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import * as productApi from '@/api/product'
import { compressImage } from '@/utils/imageCompress'
import { getFileUrl } from '@/utils/fileUrl'
import { CATEGORIES, CONDITIONS, TRADE_MODES } from '@/constants/product'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const loadError = ref('')
const fileList = ref([])
const videoPreviewUrl = ref('')
const isEdit = computed(() => !!route.params.id)

const form = ref({
  title: '',
  tradeMode: 'sell',
  category: 'other',
  price: 0,
  originalPrice: null,
  condition: 'good',
  location: '',
  description: '',
  images: [],
  videos: [],
  groupBuy: { enabled: false, minCount: 2, groupPrice: 0 },
})

const rules = {
  title: [{ required: true, message: '请输入标题' }],
  category: [{ required: true, message: '请选择分类' }],
  price: [{ required: true, message: '请输入价格' }],
}

async function handleUpload({ file }) {
  const compressed = await compressImage(file)
  const res = await productApi.uploadImages([compressed])
  const path = res.paths?.[0] ?? res.urls[0]
  form.value.images.push(path)
  fileList.value.push({ name: file.name, url: getFileUrl(path), path })
}

function handleRemove(file) {
  const path = file.path || file.url
  form.value.images = form.value.images.filter((u) => u !== path)
  fileList.value = fileList.value.filter((f) => (f.path || f.url) !== path)
}

async function handleVideoUpload({ file }) {
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning('视频不能超过 20MB')
    return
  }
  try {
    const res = await productApi.uploadVideo(file)
    form.value.videos = [res.path]
    videoPreviewUrl.value = getFileUrl(res.path)
    ElMessage.success('视频上传成功')
  } catch (e) {
    ElMessage.error(e.message || '视频上传失败')
  }
}

function removeVideo() {
  form.value.videos = []
  videoPreviewUrl.value = ''
}

async function submit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    const payload = { ...form.value }
    if (!payload.originalPrice) delete payload.originalPrice
    if (payload.tradeMode === 'exchange' || !payload.groupBuy?.enabled) {
      payload.groupBuy = { enabled: false }
    }
    if (isEdit.value) {
      await productApi.updateProduct(route.params.id, payload)
      ElMessage.success('保存成功')
      router.push('/user/products')
    } else {
      await productApi.createProduct(payload)
      ElMessage.success('发布成功')
      router.push(authIsMerchant() ? '/merchant/products' : '/user/products')
    }
  } finally {
    submitting.value = false
  }
}

function authIsMerchant() {
  return route.path.startsWith('/merchant')
}

onMounted(async () => {
  if (isEdit.value) await loadProduct()
})

async function loadProduct() {
  loadError.value = ''
  try {
    const data = await productApi.getProductDetail(route.params.id)
    const p = data.product
    form.value = {
      title: p.title,
      tradeMode: p.tradeMode || 'sell',
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice,
      condition: p.condition,
      location: p.location,
      description: p.description,
      images: [...(p.images || [])],
      videos: [...(p.videos || [])],
      groupBuy: {
        enabled: !!p.groupBuy?.enabled,
        minCount: p.groupBuy?.minCount || 2,
        groupPrice: p.groupBuy?.groupPrice || 0,
      },
    }
    fileList.value = (p.images || []).map((url, i) => ({ name: `img-${i}`, url: getFileUrl(url), path: url }))
    if (p.videos?.[0]) videoPreviewUrl.value = getFileUrl(p.videos[0])
  } catch (e) {
    loadError.value = e.message || '加载商品信息失败'
  }
}
</script>

<style scoped>
.form-page { max-width: 800px; margin: 0 auto; }
.field-hint { margin: 0 0 8px; font-size: 12px; color: var(--app-muted); }
.video-preview { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.preview-video { width: 100%; max-width: 360px; max-height: 200px; border-radius: 8px; background: #000; }
</style>
