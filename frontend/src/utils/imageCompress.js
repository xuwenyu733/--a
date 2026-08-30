/**
 * 压缩图片，返回 Blob。超过 1MB 的图片按配置缩放和质量压缩。
 */
export function compressImage(file, { maxWidth = 1200, maxSize = 1 * 1024 * 1024, quality = 0.8 } = {}) {
  if (!file.type?.startsWith('image/')) return Promise.resolve(file)
  if (file.size <= maxSize) return Promise.resolve(file)

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }))
          } else {
            resolve(file)
          }
        },
        file.type,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
