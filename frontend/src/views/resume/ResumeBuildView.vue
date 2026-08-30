<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ResumePageShell from './ResumePageShell.vue'
import ResumeBuilderForm from '@/modules/resume/components/ResumeBuilderForm.vue'
import ResultDisplay from '@/modules/resume/components/ResultDisplay.vue'
import ResumeHistoryPanel from '@/modules/resume/components/ResumeHistoryPanel.vue'
import { useResumeStore } from '@/modules/resume/stores/resumeStore'

const store = useResumeStore()
const route = useRoute()

function activateBuilderPage() {
  store.prepareBuilderPage()
}

onMounted(activateBuilderPage)
watch(() => route.path, (path) => {
  if (path === '/resume/build') activateBuilderPage()
})
</script>

<template>
  <ResumePageShell
    title="AI 简历创作"
    subtitle="填写个人信息与项目经历 → 一键生成 A4 单页简历 → 导出 PDF / Word"
  >
    <div class="workspace">
      <aside class="workspace__aside">
        <ResumeBuilderForm />
        <ResumeHistoryPanel />
      </aside>

      <section class="workspace__main">
        <ResultDisplay class="workspace__result" />
      </section>
    </div>
  </ResumePageShell>
</template>

<style scoped>
.workspace {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.workspace__aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workspace__main {
  min-width: 0;
}

.workspace__result {
  min-width: 0;
  width: 100%;
}

.workspace__result :deep(.result-card) {
  min-height: 480px;
}

@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
