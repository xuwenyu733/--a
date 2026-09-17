import rateLimit from 'express-rate-limit'

const skipInTest = () => process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'

/** 全局限流：按 IP，排除健康检查 */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 40029, message: '请求过于频繁，请稍后再试', data: null },
  skip: (req) => skipInTest() || req.path === '/health' || req.path.endsWith('/health'),
})
