<script setup>
import { computed } from 'vue'
import { DEFAULT_RESUME_TEMPLATE } from '../constants/resumeTemplates'

const props = defineProps({
  templateId: {
    type: String,
    default: DEFAULT_RESUME_TEMPLATE,
  },
  html: {
    type: String,
    default: '',
  },
})

const rootClass = computed(
  () => `resume-tpl resume-tpl--${props.templateId || DEFAULT_RESUME_TEMPLATE}`
)

const isFormPreview = computed(() => props.html?.includes('resume-doc'))
const docClass = computed(() =>
  isFormPreview.value ? 'resume-form-doc' : 'markdown-body resume-tpl__doc'
)
</script>

<template>
  <div v-if="html" :class="rootClass">
    <div class="resume-a4-frame">
      <div class="resume-a4-sheet">
        <div class="resume-a4-fit-target">
          <div :class="docClass" v-html="html" />
        </div>
      </div>
    </div>
  </div>
</template>
