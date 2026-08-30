<script setup>
import { computed } from 'vue'
import { getTemplateById } from '../constants/resumeTemplates'
import { buildFormPreviewHtml } from '../utils/buildFormPreviewHtml'
import { createTemplateDemoForm } from '../utils/templateDemoForm'
import ResumeStyledView from './ResumeStyledView.vue'

const visible = defineModel('visible', { type: Boolean, default: false })
const templateId = defineModel('templateId', { type: String, default: 'classic-green' })

const emit = defineEmits(['use-template'])

const tpl = computed(() => getTemplateById(templateId.value))

const previewHtml = computed(() =>
  buildFormPreviewHtml(createTemplateDemoForm(), templateId.value)
)

function onUse() {
  emit('use-template', templateId.value)
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="template-detail-dialog"
    :title="`${tpl.name} · 模版预览`"
    width="min(92vw, 820px)"
    top="4vh"
    destroy-on-close
    append-to-body
  >
    <div class="detail-layout">
      <aside class="detail-aside">
        <div class="detail-aside__badge" :style="{ background: tpl.accent }">
          {{ tpl.sample }}
        </div>
        <p class="detail-desc">{{ tpl.description }}</p>
        <p class="detail-suitable">
          <span class="label">适用场景</span>
          {{ tpl.suitableFor }}
        </p>
        <ul class="detail-features">
          <li v-for="(f, i) in tpl.features" :key="i">{{ f }}</li>
        </ul>
        <el-button type="primary" class="detail-use-btn" @click="onUse">
          使用此模版
        </el-button>
      </aside>

      <div class="detail-preview-wrap">
        <p class="detail-preview-tip">示例内容（放大预览，可滚动查看 A4 版面细节）</p>
        <div class="detail-preview-paper">
          <div class="detail-preview-scale">
            <ResumeStyledView :template-id="templateId" :html="previewHtml" />
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: minmax(200px, 240px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  max-height: calc(86vh - 100px);
}

.detail-aside {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  overflow-y: auto;
  max-height: calc(86vh - 100px);
  padding-right: 4px;
}

.detail-aside__badge {
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.detail-desc {
  margin: 0;
  line-height: 1.55;
  color: var(--el-text-color-primary);
}

.detail-suitable {
  margin: 0;
  padding: 8px 10px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
}

.detail-suitable .label {
  display: block;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  font-size: 11px;
}

.detail-features {
  margin: 0;
  padding-left: 1.15em;
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-text-color-secondary);
}

.detail-use-btn {
  margin-top: 4px;
  width: 100%;
}

.detail-preview-wrap {
  min-width: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(86vh - 100px);
}

.detail-preview-tip {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-preview-paper {
  flex: 1;
  min-height: 320px;
  max-height: calc(86vh - 140px);
  overflow: auto;
  background: #e8ecf1;
  border-radius: 10px;
  padding: 20px 16px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
}

.detail-preview-scale {
  transform: scale(1.22);
  transform-origin: top center;
  width: 82%;
  max-width: 520px;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.12);
  padding: 20px 18px 28px;
  min-height: 480px;
}

.detail-preview-scale :deep(.resume-tpl) {
  font-size: 14px;
}

.detail-preview-scale :deep(.resume-name) {
  font-size: 24px;
}

.detail-preview-scale :deep(.resume-section__title) {
  font-size: 14px;
  padding: 6px 14px;
}

@media (max-width: 720px) {
  .detail-layout {
    grid-template-columns: 1fr;
    max-height: none;
  }

  .detail-aside {
    max-height: none;
  }

  .detail-preview-paper {
    max-height: 55vh;
  }

  .detail-preview-scale {
    transform: scale(1.05);
    width: 95%;
  }
}
</style>

<style>
.template-detail-dialog .el-dialog__body {
  padding-top: 8px;
  padding-bottom: 16px;
}
</style>
