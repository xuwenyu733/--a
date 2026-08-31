/** 将简历 Markdown 解析为分段结构，便于小程序展示 */
export function parseResumeMarkdown(markdown) {
  if (!markdown?.trim()) return { name: '', sections: [] }

  const lines = markdown.split('\n')
  let name = ''
  const sections = []
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const h1 = line.match(/^#\s+(.+)/)
    if (h1 && !name) {
      name = h1[1].trim()
      continue
    }

    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      if (current) sections.push(current)
      current = { title: h2[1].trim(), items: [], paragraph: '' }
      continue
    }

    const li = line.match(/^[-*•]\s+(.+)/)
    if (li) {
      if (!current) current = { title: '', items: [], paragraph: '' }
      current.items.push(li[1].trim())
      continue
    }

    if (line.startsWith('#')) continue
    if (!current) current = { title: '', items: [], paragraph: '' }
    current.paragraph = current.paragraph
      ? `${current.paragraph}\n${line}`
      : line
  }

  if (current) sections.push(current)
  return { name, sections: sections.filter((s) => s.title || s.items.length || s.paragraph) }
}

export function resumeExportPayload(record, titleFallback = '我的简历') {
  const content = record?.optimizedContent || record?.originalContent || ''
  const builderData = record?.builderData || null
  const fileName = record?.fileName?.trim()
    || builderData?.name
    || titleFallback

  return {
    content,
    fileName,
    template: builderData?.template || 'classic-green',
    photoUrl: record?.photoUrl || builderData?.photoUrl || '',
    builderData,
  }
}
