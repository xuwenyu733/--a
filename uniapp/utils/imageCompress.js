/**
 * 小程序端：过大图片上传前自动压缩。
 * 优先 uni.compressImage；失败则原样返回。
 */
const TARGET_BYTES = 2 * 1024 * 1024
const HARD_MAX_BYTES = 14 * 1024 * 1024

function getFileSize(filePath) {
  return new Promise((resolve) => {
    uni.getFileInfo({
      filePath,
      success: (res) => resolve(Number(res.size) || 0),
      fail: () => resolve(0),
    })
  })
}

function compressOnce(src, quality) {
  return new Promise((resolve, reject) => {
    if (typeof uni.compressImage !== 'function') {
      reject(new Error('compressImage unavailable'))
      return
    }
    uni.compressImage({
      src,
      quality,
      success: (res) => resolve(res.tempFilePath || src),
      fail: (err) => reject(err),
    })
  })
}

/**
 * @param {string} filePath 本地临时路径
 * @returns {Promise<string>} 可用于 uploadFile 的路径
 */
export async function compressImageForUpload(filePath) {
  let size = await getFileSize(filePath)
  if (!size || size <= TARGET_BYTES) return filePath

  let path = filePath
  for (const quality of [80, 60, 40, 30]) {
    try {
      path = await compressOnce(path, quality)
      size = await getFileSize(path)
      if (size && size <= TARGET_BYTES) return path
    } catch {
      break
    }
  }

  size = await getFileSize(path)
  if (size > HARD_MAX_BYTES) {
    throw new Error('图片过大，请换一张更小的图后再试')
  }
  return path
}
