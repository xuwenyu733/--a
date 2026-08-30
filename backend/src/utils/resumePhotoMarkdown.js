/** 证件照 Markdown 路径规范化 */
export function normalizePhotoPath(photoUrl) {
  if (!photoUrl?.trim()) return ''
  const p = photoUrl.trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return p.startsWith('/') ? p : `/${p}`
}

export function contentHasPhoto(content, photoUrl) {
  if (!content?.trim() || !photoUrl?.trim()) return false
  const raw = photoUrl.trim()
  const norm = normalizePhotoPath(raw)
  const stripped = norm.replace(/^\//, '')
  return content.includes(raw) || content.includes(norm) || content.includes(stripped)
}

/** 确保 Markdown 文首包含证件照（A4 微调后可能被 AI 删掉） */
export function ensurePhotoInMarkdown(content, photoUrl) {
  if (!photoUrl?.trim() || !content?.trim()) return content || ''
  if (contentHasPhoto(content, photoUrl)) return content
  const src = normalizePhotoPath(photoUrl)
  return `![证件照](${src})\n\n${content}`
}
