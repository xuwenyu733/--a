import { renderSafeMarkdown } from './markdown'
import { getFileUrl } from '@/utils/fileUrl'
import {
  transformResumeHtml,
  buildMetaGridFromPairs,
  parseContactFromHeadBlock,
} from './resumeLayoutTransform'
import {
  normalizeResumeHeader,
  buildHeaderMetaFromForm,
  headerMetaToGridMap,
  resolveHeaderMeta,
} from './normalizeResumeHeader'
import {
  stripPhotoFromMarkdown,
  extractLeadingPhotoHtml,
  removeStrayPhotoBlocks,
} from './resumePhotoHtml'

function normalizePhotoPath(photoUrl) {
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

/** 保留供服务端 A4 补图；前端渲染不再插入 Markdown 图片语法 */
export function ensurePhotoInMarkdown(content, photoUrl) {
  if (!photoUrl?.trim() || !content?.trim()) return content || ''
  if (contentHasPhoto(content, photoUrl)) return content
  const src = normalizePhotoPath(photoUrl)
  return `![证件照](${src})\n\n${content}`
}

function rewriteImgSrc(html, photoUrl) {
  if (!html) return html
  let out = html
  const resolved = getFileUrl(normalizePhotoPath(photoUrl))
  if (resolved) {
    const raw = photoUrl.trim()
    const norm = normalizePhotoPath(raw)
    const variants = [raw, norm, norm.replace(/^\//, '')].filter(Boolean)
    for (const v of variants) {
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      out = out.replace(new RegExp(`src="${escaped}"`, 'g'), `src="${resolved}"`)
      out = out.replace(new RegExp(`src='${escaped}'`, 'g'), `src="${resolved}"`)
    }
  }
  return out.replace(/<img([^>]*)\ssrc="([^"]+)"/gi, (match, attrs, src) => {
    if (src.startsWith('http://') || src.startsWith('https://')) return match
    const fixed = getFileUrl(src)
    return fixed ? `<img${attrs} src="${fixed}"` : match
  })
}

function extractNameFromH1(h1Html) {
  const m = h1Html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  return m ? m[1] : ''
}

function splitBodyHtml(work) {
  const h2Idx = work.search(/<h2[\s>]/i)
  if (h2Idx >= 0) return work.slice(h2Idx)
  return work
    .replace(/^<h1[\s\S]*?<\/h1>\s*/i, '')
    .replace(/^\s*<ul[\s\S]*?<\/ul>\s*/i, '')
    .replace(/^\s*<p>[\s\S]*?<\/p>\s*/i, '')
}

function wrapMarkdownHeader(html, photoUrl, headerMeta) {
  const { photoHtml, rest: work } = extractLeadingPhotoHtml(html, photoUrl)

  const bodyHtml = splitBodyHtml(work)
  const h2Idx = work.search(/<h2[\s>]/i)
  const headSlice = h2Idx >= 0 ? work.slice(0, h2Idx) : work
  const name = headerMeta?.name
    ? headerMeta.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : extractNameFromH1(work.match(/<h1[\s\S]*?<\/h1>/i)?.[0] || '')

  const metaGrid = headerMeta
    ? buildMetaGridFromPairs(headerMetaToGridMap(headerMeta))
    : buildMetaGridFromPairs(parseContactFromHeadBlock(headSlice))

  const photoCol = photoHtml
    ? `<div class="resume-markdown-head__photo">${photoHtml}</div>`
    : ''

  return `<div class="resume-markdown-head">
  <div class="resume-markdown-head__main">
    <h1 class="resume-name">${name}</h1>
    ${metaGrid}
  </div>
  ${photoCol}
</div>${removeStrayPhotoBlocks(bodyHtml)}`
}

export function renderResumeMarkdown(markdown, { photoUrl, builderForm } = {}) {
  let md = markdown || ''
  const headerMeta = resolveHeaderMeta(md, builderForm, photoUrl)
  if (headerMeta) md = normalizeResumeHeader(md, headerMeta)
  if (photoUrl) md = stripPhotoFromMarkdown(md, photoUrl)
  let html = renderSafeMarkdown(md)
  html = rewriteImgSrc(html, photoUrl)
  html = wrapMarkdownHeader(html, photoUrl, headerMeta)
  return transformResumeHtml(html)
}
