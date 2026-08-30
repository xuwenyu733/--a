import QRCode from 'qrcode'
import { getFileUrl } from '@/utils/fileUrl'

export function getProductShareUrl(productId) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/products/${productId}`
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const chars = [...text]
  const lines = []
  let line = ''
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length >= maxLines) break
    } else {
      line = test
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (chars.length && lines.join('').length < text.length && lines.length === maxLines) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : `${last}…`
  }
  return lines
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ _id: string, title: string, price?: number, tradeMode?: string, images?: string[] }} product
 */
export async function drawProductSharePoster(canvas, product) {
  const W = 600
  const H = 900
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#1a5f4a')
  grad.addColorStop(1, '#0d3328')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#fff'
  ctx.fillRect(24, 24, W - 48, H - 48)
  ctx.fillStyle = '#1a5f4a'
  ctx.font = 'bold 22px system-ui, sans-serif'
  ctx.fillText('校园二手 · 好物分享', 40, 58)

  const imgY = 72
  const imgH = 320
  const imgW = W - 80
  ctx.fillStyle = '#f0f2f5'
  ctx.fillRect(40, imgY, imgW, imgH)

  const firstImg = product.images?.[0]
  if (firstImg) {
    try {
      const img = await loadImage(getFileUrl(firstImg))
      const ratio = Math.min(imgW / img.width, imgH / img.height)
      const dw = img.width * ratio
      const dh = img.height * ratio
      const dx = 40 + (imgW - dw) / 2
      const dy = imgY + (imgH - dh) / 2
      ctx.drawImage(img, dx, dy, dw, dh)
    } catch {
      ctx.fillStyle = '#909399'
      ctx.font = '16px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('暂无图片', W / 2, imgY + imgH / 2)
      ctx.textAlign = 'left'
    }
  }

  const titleY = imgY + imgH + 36
  ctx.fillStyle = '#303133'
  ctx.font = 'bold 26px system-ui, sans-serif'
  const titleLines = wrapText(ctx, product.title || '校园好物', imgW, 2)
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 40, titleY + i * 34)
  })

  const isExchange = product.tradeMode === 'exchange'
  const priceText =
    isExchange && !product.price
      ? '面议交换'
      : isExchange
        ? `换物 · ¥${product.price ?? 0}`
        : `¥${product.price ?? 0}`

  ctx.fillStyle = '#f56c6c'
  ctx.font = 'bold 36px system-ui, sans-serif'
  ctx.fillText(priceText, 40, titleY + titleLines.length * 34 + 40)

  const shareUrl = getProductShareUrl(product._id)
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 200, margin: 1, color: { dark: '#1a5f4a' } })
  const qrImg = await loadImage(qrDataUrl)
  const qrSize = 140
  const qrX = W - 40 - qrSize
  const qrY = H - 48 - qrSize - 56
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

  ctx.fillStyle = '#606266'
  ctx.font = '14px system-ui'
  ctx.fillText('扫码查看详情', qrX, qrY + qrSize + 22)

  ctx.fillStyle = '#909399'
  ctx.font = '12px system-ui'
  const hint = shareUrl.length > 42 ? `${shareUrl.slice(0, 40)}…` : shareUrl
  ctx.fillText(hint, 40, H - 56)

  return shareUrl
}

export function downloadCanvas(canvas, filename = 'share-poster.png') {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
