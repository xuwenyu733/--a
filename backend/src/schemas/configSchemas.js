import { z } from 'zod'

const bannerSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100, '标题最多 100 字'),
  subtitle: z.string().max(200, '副标题最多 200 字').optional().default(''),
  image: z.string().max(500).optional().default(''),
  link: z.string().max(200).optional().default(''),
})

export const updatePlatformConfigSchema = z
  .object({
    banners: z.array(bannerSchema).max(10, '轮播图最多 10 条').optional(),
    announcement: z.string().max(500, '公告最多 500 字').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: '请至少填写一项' })
