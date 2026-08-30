<template>
  <el-dialog v-model="visible" title="分享海报" width="420px" destroy-on-close @opened="onOpened">
    <div v-loading="generating" class="poster-wrap">
      <canvas ref="canvasRef" class="poster-canvas" />
    </div>
    <p v-if="shareUrl" class="share-url">{{ shareUrl }}</p>
    <template #footer>
      <el-button @click="copyLink" :disabled="!shareUrl">复制链接</el-button>
      <el-button type="primary" :disabled="!ready" @click="handleDownload">保存图片</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { drawProductSharePoster, downloadCanvas, getProductShareUrl } from '@/utils/sharePoster'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  product: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const canvasRef = ref(null)
const generating = ref(false)
const ready = ref(false)
const shareUrl = ref('')

async function onOpened() {
  if (!props.product?._id || !canvasRef.value) return
  generating.value = true
  ready.value = false
  shareUrl.value = getProductShareUrl(props.product._id)
  try {
    shareUrl.value = await drawProductSharePoster(canvasRef.value, props.product)
    ready.value = true
  } catch {
    ElMessage.error('海报生成失败，请稍后重试')
  } finally {
    generating.value = false
  }
}

function handleDownload() {
  if (!canvasRef.value || !ready.value) return
  const safeName = (props.product?.title || '商品').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 20)
  downloadCanvas(canvasRef.value, `${safeName}-分享.png`)
  ElMessage.success('已开始下载')
}

async function copyLink() {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制下方链接')
  }
}
</script>

<style scoped>
.poster-wrap {
  display: flex;
  justify-content: center;
  min-height: 200px;
}
.poster-canvas {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.share-url {
  margin-top: 12px;
  font-size: 12px;
  color: var(--app-muted);
  word-break: break-all;
}
</style>
