/** 识别小程序等非 Cookie 客户端 */
export function isMiniProgramClient(req) {
  const h = req.headers['x-client'] || req.headers['X-Client'] || ''
  if (String(h).toLowerCase() === 'miniprogram') return true
  return req.body?.clientType === 'miniprogram'
}
