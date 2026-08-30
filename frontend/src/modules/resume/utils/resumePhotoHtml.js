import { getFileUrl } from '@/utils/fileUrl'

/** 从正文中移除证件照 Markdown，避免渲染成整页大图 */
export function stripPhotoFromMarkdown(markdown, photoUrl) {
  if (!markdown?.trim()) return markdown || ''
  let md = markdown
  md = md.replace(/^!\[证件照\]\([^)]+\)\s*\n*/gim, '')
  md = md.replace(/^[-*]\s*证件照[：:][^\n]*\n?/gim, '')
  if (photoUrl?.trim()) {
    const raw = photoUrl.trim()
    const norm = raw.startsWith('/') ? raw : `/${raw}`
    const stripped = norm.replace(/^\//, '')
    for (const v of [raw, norm, stripped]) {
      if (!v) continue
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      md = md.replace(new RegExp(`^[-*]\\s*证件照[：:][^\\n]*${esc}[^\\n]*\\n?`, 'gim'), '')
    }
  }
  return md.trimStart()
}

function extractImgSrc(fragment) {
  const m = fragment.match(/\ssrc="([^"]+)"/i) || fragment.match(/\ssrc='([^']+)'/i)
  return m ? m[1] : ''
}

export function buildPhotoBox(src) {
  if (!src) return ''
  return `<div class="resume-photo"><img src="${src}" alt="证件照" width="88" height="123" /></div>`
}

/** 提取文首证件照 HTML，返回小图容器 + 剩余正文 */
export function extractLeadingPhotoHtml(html, photoUrl = '') {
  let work = html.trim()

  const divMatch = work.match(/^<div class="resume-photo[^>]*>[\s\S]*?<\/div>\s*/i)
  if (divMatch) {
    const inner = divMatch[0]
    const src = extractImgSrc(inner)
    return {
      photoHtml: buildPhotoBox(src ? getFileUrl(src) || src : ''),
      rest: work.slice(divMatch[0].length).trimStart(),
    }
  }

  const pImgMatch = work.match(/^<p>\s*<img[\s\S]*?<\/p>\s*/i)
  if (pImgMatch) {
    const src = extractImgSrc(pImgMatch[0])
    return {
      photoHtml: buildPhotoBox(getFileUrl(src) || src),
      rest: work.slice(pImgMatch[0].length).trimStart(),
    }
  }

  const loneImg = work.match(/^<img[\s\S]*?>\s*/i)
  if (loneImg) {
    const src = extractImgSrc(loneImg[0])
    return {
      photoHtml: buildPhotoBox(getFileUrl(src) || src),
      rest: work.slice(loneImg[0].length).trimStart(),
    }
  }

  if (photoUrl?.trim()) {
    const url = getFileUrl(photoUrl.trim().startsWith('/') ? photoUrl.trim() : `/${photoUrl.trim()}`)
    if (url) {
      return { photoHtml: buildPhotoBox(url), rest: work }
    }
  }

  return { photoHtml: '', rest: work }
}

/** 移除正文里残留的证件照块 */
export function removeStrayPhotoBlocks(html) {
  return html
    .replace(/<p>\s*<img[^>]*alt="证件照"[^>]*>\s*<\/p>/gi, '')
    .replace(/<div class="resume-photo[^>]*>[\s\S]*?<\/div>/gi, (match, offset, full) => {
      if (full.indexOf('resume-markdown-head__photo') !== -1) return match
      return ''
    })
}
