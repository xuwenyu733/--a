/**
 * 转义 HTML 后高亮关键词，可安全用于 v-html
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function highlightKeyword(text, keyword) {
  const safe = escapeHtml(text)
  const kw = (keyword || '').trim()
  if (!kw) return safe
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safe.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="chat-highlight">$1</mark>'
  )
}
