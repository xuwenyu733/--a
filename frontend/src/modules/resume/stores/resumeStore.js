import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { generateResumeFromForm } from '../services/api'
import { loadResumeState, saveResumeState, clearResumeState } from '../utils/resumeStorage'
import { DEFAULT_RESUME_STYLE, normalizeResumeStyle } from '../constants/resumeStyles'
import { createEmptyBuilderForm } from '../utils/defaultBuilderForm'
import {
  listResumeHistory,
  getResumeHistory,
  createResumeHistory,
  updateResumeHistory,
  deleteResumeHistory,
} from '@/api/resumeHistory'

const saved = loadResumeState()

export const useResumeStore = defineStore('resume', () => {
  const fileName = ref(saved?.fileName || '')
  const originalContent = ref(saved?.originalContent || '')
  const optimizedContent = ref(saved?.optimizedContent || '')
  const suggestions = ref(Array.isArray(saved?.suggestions) ? saved.suggestions : [])
  const a4Metrics = ref(saved?.a4Metrics || null)
  const jobDescription = ref(saved?.jobDescription || '')
  const style = ref(normalizeResumeStyle(saved?.style || DEFAULT_RESUME_STYLE))
  const sourceType = ref('builder')
  const builderForm = ref({
    ...createEmptyBuilderForm(),
    ...(saved?.builderForm || {}),
    style: normalizeResumeStyle(saved?.builderForm?.style || saved?.style),
  })
  const generating = ref(false)
  const generatePhase = ref('')
  const saving = ref(false)
  const error = ref('')
  const errorCode = ref(null)
  const currentRecordId = ref(saved?.currentRecordId || '')
  const historyList = ref([])

  const GENERATE_PHASES = [
    { at: 0, text: '正在提交表单…' },
    { at: 2500, text: 'AI 正在撰写简历…' },
    { at: 20000, text: '正在适配 A4 单页…' },
    { at: 60000, text: '仍在生成中，请稍候…' },
  ]

  let phaseTimers = []

  function clearGeneratePhases() {
    phaseTimers.forEach((t) => clearTimeout(t))
    phaseTimers = []
    generatePhase.value = ''
  }

  function startGeneratePhases() {
    clearGeneratePhases()
    generatePhase.value = GENERATE_PHASES[0].text
    for (const p of GENERATE_PHASES.slice(1)) {
      phaseTimers.push(
        setTimeout(() => {
          if (generating.value) generatePhase.value = p.text
        }, p.at)
      )
    }
  }

  function snapshotPayload() {
    return {
      fileName: fileName.value,
      originalContent: originalContent.value,
      optimizedContent: optimizedContent.value,
      suggestions: suggestions.value,
      a4Metrics: a4Metrics.value,
      jobDescription: jobDescription.value,
      style: style.value,
      sourceType: sourceType.value,
      builderForm: builderForm.value,
      photoUrl: builderForm.value?.photoUrl || '',
    }
  }

  function persistState() {
    if (!optimizedContent.value && !builderForm.value?.name?.trim()) {
      saveResumeState({
        builderForm: builderForm.value,
        sourceType: sourceType.value,
        currentRecordId: currentRecordId.value,
      })
      return
    }

    saveResumeState({
      ...snapshotPayload(),
      currentRecordId: currentRecordId.value,
    })
  }

  let persistTimer = null
  watch(
    [fileName, originalContent, optimizedContent, suggestions, a4Metrics, jobDescription, style, currentRecordId, builderForm],
    () => {
      clearTimeout(persistTimer)
      persistTimer = setTimeout(persistState, 300)
    },
    { deep: true }
  )

  function clearError() {
    error.value = ''
    errorCode.value = null
  }

  function prepareBuilderPage() {
    sourceType.value = 'builder'
  }

  async function fetchHistory() {
    const data = await listResumeHistory({ page: 1, pageSize: 30 })
    historyList.value = data.list || []
  }

  async function saveToCloud() {
    if (!optimizedContent.value?.trim()) return
    saving.value = true
    try {
      const payload = {
        ...snapshotPayload(),
        sourceType: 'builder',
        photoUrl: builderForm.value?.photoUrl || '',
        builderData: { ...builderForm.value },
      }
      if (currentRecordId.value) {
        await updateResumeHistory(currentRecordId.value, payload)
      } else {
        const doc = await createResumeHistory(payload)
        currentRecordId.value = doc._id
      }
      await fetchHistory()
    } finally {
      saving.value = false
    }
  }

  async function loadFromHistory(id) {
    const doc = await getResumeHistory(id)
    fileName.value = doc.fileName || ''
    originalContent.value = doc.originalContent || ''
    optimizedContent.value = doc.optimizedContent || ''
    suggestions.value = doc.suggestions || []
    a4Metrics.value = doc.a4Metrics || null
    jobDescription.value = doc.jobDescription || ''
    style.value = normalizeResumeStyle(doc.style)
    sourceType.value = 'builder'
    if (doc.builderData) {
      builderForm.value = {
        ...createEmptyBuilderForm(),
        ...doc.builderData,
        style: normalizeResumeStyle(doc.builderData.style || doc.style),
      }
    }
    currentRecordId.value = doc._id
  }

  async function removeHistory(id) {
    await deleteResumeHistory(id)
    if (currentRecordId.value === id) {
      currentRecordId.value = ''
    }
    await fetchHistory()
  }

  async function generateFromBuilder() {
    generating.value = true
    clearError()
    startGeneratePhases()
    try {
      const form = { ...builderForm.value }
      const data = await generateResumeFromForm(form)
      const name = form.name?.trim() || '我的'
      fileName.value = `${name}_简历`
      originalContent.value = data.draft || ''
      optimizedContent.value = data.optimizedContent || ''
      if (!optimizedContent.value.trim()) {
        throw new Error('AI 未返回有效简历内容，请重试')
      }
      suggestions.value = data.suggestions || []
      if (data.a4Adjusted) {
        suggestions.value = [
          ...suggestions.value,
          '已自动微调内容以尽量适配 A4 单页',
        ]
      }
      a4Metrics.value = data.a4Metrics || null
      jobDescription.value = form.jobDescription || ''
      style.value = normalizeResumeStyle(form.style)
      sourceType.value = 'builder'
      currentRecordId.value = ''
      await saveToCloud()
    } catch (e) {
      error.value = e.message
      errorCode.value = e.code ?? e.status ?? null
      throw e
    } finally {
      clearGeneratePhases()
      generating.value = false
    }
  }

  async function reset() {
    fileName.value = ''
    originalContent.value = ''
    optimizedContent.value = ''
    suggestions.value = []
    a4Metrics.value = null
    jobDescription.value = ''
    style.value = DEFAULT_RESUME_STYLE
    sourceType.value = 'builder'
    builderForm.value = createEmptyBuilderForm()
    currentRecordId.value = ''
    error.value = ''
    clearResumeState()
  }

  return {
    fileName,
    originalContent,
    optimizedContent,
    suggestions,
    a4Metrics,
    jobDescription,
    style,
    sourceType,
    builderForm,
    generating,
    generatePhase,
    saving,
    error,
    errorCode,
    currentRecordId,
    historyList,
    generateFromBuilder,
    prepareBuilderPage,
    reset,
    clearError,
    fetchHistory,
    saveToCloud,
    loadFromHistory,
    removeHistory,
  }
})
