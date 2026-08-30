/** 简历 AI 生成风格（与后端 ResumeRecord.style enum 一致） */
export const RESUME_STYLE_OPTIONS = [
  { text: '专业', value: 'professional' },
  { text: '创意', value: 'creative' },
  { text: '精简', value: 'concise' },
]

export const DEFAULT_RESUME_STYLE = 'professional'

export function normalizeResumeStyle(style) {
  const allowed = new Set(RESUME_STYLE_OPTIONS.map((o) => o.value))
  return allowed.has(style) ? style : DEFAULT_RESUME_STYLE
}
