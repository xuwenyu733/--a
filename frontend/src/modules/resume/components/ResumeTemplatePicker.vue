<script setup>
import { ref } from 'vue'
import { RESUME_TEMPLATES } from '../constants/resumeTemplates'
import ResumeTemplateDetailDialog from './ResumeTemplateDetailDialog.vue'

const model = defineModel({ type: String, required: true })

const detailVisible = ref(false)
const detailTemplateId = ref('classic-green')

function openDetail(tpl) {
  detailTemplateId.value = tpl.id
  detailVisible.value = true
}

function onUseTemplate(id) {
  model.value = id
}
</script>

<template>
  <div class="template-picker">
    <div class="template-picker__label">简历模版</div>
    <p class="template-picker__hint">
      单击选择模版；<strong>双击</strong>可打开放大预览，查看版式细节
    </p>
    <div class="template-picker__grid">
      <button
        v-for="tpl in RESUME_TEMPLATES"
        :key="tpl.id"
        type="button"
        class="template-card"
        :class="{ 'template-card--active': model === tpl.id }"
        :title="`单击选用 · 双击查看「${tpl.name}」详情`"
        @click="model = tpl.id"
        @dblclick.prevent="openDetail(tpl)"
      >
        <div class="template-card__preview" :class="`template-card__preview--${tpl.id}`">
          <span class="template-card__bar" :style="{ background: tpl.accent }" />
          <span class="template-card__line" />
          <span class="template-card__line template-card__line--short" />
        </div>
        <div class="template-card__info">
          <strong>{{ tpl.name }}</strong>
          <span>{{ tpl.description }}</span>
          <span class="template-card__dblhint">双击放大预览</span>
        </div>
      </button>
    </div>

    <ResumeTemplateDetailDialog
      v-model:visible="detailVisible"
      v-model:template-id="detailTemplateId"
      @use-template="onUseTemplate"
    />
  </div>
</template>

<style scoped>
.template-picker {
  margin-bottom: 4px;
}

.template-picker__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.template-picker__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.template-picker__hint strong {
  color: var(--el-color-primary);
  font-weight: 600;
}

.template-picker__grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.template-card:hover {
  border-color: var(--el-color-primary-light-5);
}

.template-card--active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}

.template-card__preview {
  flex-shrink: 0;
  width: 52px;
  height: 68px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 6px 5px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fff;
}

.template-card__bar {
  display: block;
  height: 8px;
  border-radius: 1px;
}

.template-card__line {
  display: block;
  height: 3px;
  background: #e2e8f0;
  border-radius: 1px;
}

.template-card__line--short {
  width: 70%;
}

.template-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.template-card__info strong {
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.template-card__info > span:not(.template-card__dblhint) {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
}

.template-card__dblhint {
  font-size: 10px;
  color: var(--el-color-primary-light-3);
  margin-top: 2px;
}

.template-card:hover .template-card__dblhint {
  color: var(--el-color-primary);
}
</style>
