const MIN_ZOOM = 0.68

/**
 * 将简历内容等比缩放至 A4 内，不裁剪、不丢字
 * @returns {number} 应用的 zoom（1 表示未缩放）
 */
export function fitResumeContentToA4(sheetEl, innerEl, minZoom = MIN_ZOOM) {
  if (!sheetEl || !innerEl) return 1

  innerEl.style.zoom = '1'
  innerEl.style.transform = 'none'
  innerEl.style.width = '100%'

  const cs = getComputedStyle(sheetEl)
  const padT = parseFloat(cs.paddingTop) || 0
  const padB = parseFloat(cs.paddingBottom) || 0
  const available = sheetEl.clientHeight - padT - padB
  const contentH = innerEl.scrollHeight

  if (contentH <= available + 1) return 1

  const zoom = Math.max(minZoom, available / contentH)
  innerEl.style.zoom = String(zoom)
  innerEl.style.transformOrigin = 'top center'
  return zoom
}

export { MIN_ZOOM }
