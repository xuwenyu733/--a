<script setup>
import { computed, ref } from 'vue';
import { saveAs } from 'file-saver';
import { ElMessage } from 'element-plus';
import { useResumeStore } from '../stores/resumeStore';
import { exportResume } from '../services/api';
import { renderResumeMarkdown } from '../utils/renderResumeMarkdown';
import { DEFAULT_RESUME_TEMPLATE } from '../constants/resumeTemplates';
import ResumeStyledView from './ResumeStyledView.vue';

const store = useResumeStore();
const exportFormat = ref('pdf');
const exporting = ref(false);

const showResult = computed(() => Boolean(store.optimizedContent?.trim()));

const rendered = computed(() =>
  renderResumeMarkdown(store.optimizedContent, {
    photoUrl: store.builderForm?.photoUrl || '',
    builderForm: store.builderForm?.name?.trim() ? store.builderForm : null,
  })
);

const builderTemplateId = computed(
  () => store.builderForm?.template || DEFAULT_RESUME_TEMPLATE
);

const a4FillPercent = computed(() => {
  const ratio = store.a4Metrics?.fillRatio;
  if (ratio == null) return null;
  return Math.round(ratio * 100);
});

const a4Tag = computed(() => {
  const m = store.a4Metrics;
  if (!m) return null;
  if (m.isOverflow || m.pages > 1) {
    return { type: 'warning', text: `超出单页（约 ${m.pages} 页）` };
  }
  if (a4FillPercent.value != null) {
    return { type: 'success', text: `A4 单页 · 版面 ${a4FillPercent.value}%` };
  }
  return { type: 'success', text: 'A4 单页' };
});

const formatLabels = {
  pdf: 'PDF',
  xlsx: 'Excel (.xlsx)',
};

function getBaseFileName() {
  const name = store.fileName?.replace(/\.[^.]+$/, '') || '我的简历';
  return name || '我的简历';
}

async function handleExport() {
  if (!store.optimizedContent) return;

  const baseName = getBaseFileName();
  exporting.value = true;
  try {
    const form = store.builderForm;
    const hasForm = Boolean(form?.name?.trim());
    const { blob } = await exportResume({
      content: store.optimizedContent,
      format: exportFormat.value,
      fileName: baseName,
      template: builderTemplateId.value,
      photoUrl: form?.photoUrl || '',
      builderData: hasForm ? { ...form } : null,
    });

    const ext = exportFormat.value === 'pdf' ? '.pdf' : '.xlsx';
    saveAs(blob, `${baseName}${ext}`);
    ElMessage.success(`已导出 ${formatLabels[exportFormat.value]}`);
  } catch (err) {
    ElMessage.error(err.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

</script>

<template>
  <el-card class="result-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="card-header__title">
          <span>生成结果</span>
          <el-tag v-if="a4Tag" size="small" :type="a4Tag.type" class="a4-tag">
            {{ a4Tag.text }}
          </el-tag>
        </div>
        <div v-if="showResult" class="header-actions">
          <el-select v-model="exportFormat" size="small" class="format-select">
            <el-option label="PDF（当前模版）" value="pdf" />
            <el-option label="Excel (.xlsx)" value="xlsx" />
          </el-select>
          <el-button
            type="primary"
            size="small"
            :loading="exporting"
            @click="handleExport"
          >
            导出
          </el-button>
        </div>
      </div>
    </template>

    <template v-if="showResult">
      <div v-if="store.suggestions.length" class="suggestions">
        <h4>生成说明</h4>
        <ul>
          <li v-for="(item, i) in store.suggestions" :key="i">{{ item }}</li>
        </ul>
      </div>

      <el-divider />

      <ResumeStyledView
        class="content"
        :template-id="builderTemplateId"
        :html="rendered"
      />
    </template>

    <el-empty v-else description="填写信息并点击「生成完整简历」" />
  </el-card>
</template>

<style scoped>
.result-card {
  border-radius: 12px;
  min-height: calc(100vh - 200px);
  min-height: calc(100dvh - 200px);
  display: flex;
  flex-direction: column;
}

.result-card :deep(.el-card__body) {
  flex: 1;
  overflow: visible;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.card-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.a4-tag {
  font-weight: normal;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.format-select {
  width: 160px;
}

.suggestions {
  background: #f0f9ff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
}

.suggestions h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #0369a1;
}

.suggestions ul {
  margin: 0;
  padding-left: 1.2em;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.content {
  flex: 1 1 auto;
  overflow: visible;
  padding: 12px 8px 24px;
  max-width: 100%;
}

.content :deep(.resume-a4-frame) {
  padding: 0;
}
</style>
