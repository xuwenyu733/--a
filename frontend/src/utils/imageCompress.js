/**
 * 压缩图片，返回 File/Blob。
 * 超过 maxSize 时按宽度与质量多次压缩，尽量压到上限以内。
 */
export function compressImage(file, { maxWidth = 1600, maxSize = 2 * 1024 * 1024, quality = 0.82 } = {}) {
  if (!file?.type?.startsWith('image/')) return Promise.resolve(file)
  if (file.size <= maxSize) return Promise.resolve(file)

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      const scale = Math.min(1, maxWidth / Math.max(width, 1))
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const baseName = String(file.name || 'image').replace(/\.\w+$/, '') + (mime === 'image/png' ? '.png' : '.jpg')

      let q = quality
      let blob = null
      for (let i = 0; i < 6; i++) {
        blob = await new Promise((r) => canvas.toBlob(r, mime, q))
        if (!blob) break
        if (blob.size <= maxSize) break
        q = Math.max(0.35, q - 0.12)
        if (q <= 0.4 && width > 1000) {
          width = Math.round(width * 0.85)
          height = Math.round(height * 0.85)
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
        }
      }

      if (blob) {
        resolve(new File([blob], baseName, { type: mime, lastModified: Date.now() }))
      } else {
        resolve(file)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
