import DOMPurify from 'dompurify'

/**
 * 安全地渲染用户输入的 HTML 内容，防止 XSS。
 * 仅在必须使用 v-html 时调用。
 */
export function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}
