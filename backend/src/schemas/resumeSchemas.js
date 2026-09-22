import { z } from 'zod'
import { paginationQuerySchema } from './commonSchemas.js'

const educationSchema = z.object({
  school: z.string().max(100).optional(),
  major: z.string().max(100).optional(),
  degree: z.string().max(50).optional(),
  start: z.string().max(20).optional(),
  end: z.string().max(20).optional(),
})

const projectSchema = z.object({
  name: z.string().max(100).optional(),
  targetRole: z.string().max(100).optional(),
  start: z.string().max(20).optional(),
  end: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
  techStack: z.array(z.string().max(50)).max(20).optional(),
})

const experienceSchema = z.object({
  company: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  start: z.string().max(20).optional(),
  end: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
})

const resumeStyleSchema = z.enum(['professional', 'creative', 'concise'])
const resumeTemplateSchema = z.enum(['classic-green', 'modern-blue', 'sidebar-navy'])
const resumeSourceTypeSchema = z.enum(['upload', 'builder'])

const a4MetricsSchema = z
  .object({
    fontSize: z.number().optional(),
    pages: z.number().optional(),
    fillRatio: z.number().optional(),
    isOverflow: z.boolean().optional(),
    fitsA4: z.boolean().optional(),
  })
  .optional()
  .nullable()

export const listResumeHistoryQuerySchema = paginationQuerySchema

export const saveResumeRecordSchema = z.object({
  fileName: z.string().max(200).optional(),
  originalContent: z.string().max(80000).optional().default(''),
  optimizedContent: z
    .string({ required_error: '请先完成简历生成后再保存' })
    .trim()
    .min(1, '请先完成简历生成后再保存')
    .max(80000),
  suggestions: z.array(z.string().max(500)).max(20).optional().default([]),
  a4Metrics: a4MetricsSchema,
  jobDescription: z.string().max(10000).optional().default(''),
  style: resumeStyleSchema.optional(),
  sourceType: resumeSourceTypeSchema.optional(),
  photoUrl: z.string().max(500).optional().default(''),
  builderData: z.record(z.unknown()).optional().nullable(),
})

export const generateResumeSchema = z
  .object({
    name: z.string({ required_error: '请填写姓名' }).trim().min(1, '请填写姓名').max(50),
    age: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v === undefined || v === null || v === '' ? undefined : String(v).trim()))
      .refine((v) => v === undefined || (/^\d{1,2}$/.test(v) && Number(v) >= 15 && Number(v) <= 60), {
        message: '年龄请填写 15～60 之间的数字',
      }),
    phone: z.string().max(20).optional().default(''),
    email: z.string().max(100).optional().default(''),
    city: z.string().max(50).optional(),
    targetRole: z.string().max(100).optional(),
    summary: z.string().max(2000).optional(),
    skills: z.array(z.string().max(50)).max(30).optional().default([]),
    educations: z.array(educationSchema).max(10).optional().default([]),
    projects: z.array(projectSchema).max(20).optional().default([]),
    experiences: z.array(experienceSchema).max(20).optional().default([]),
    honors: z.string().max(500).optional(),
    photoUrl: z.string().max(500).optional().default(''),
    jobDescription: z.string().max(10000).optional(),
    style: resumeStyleSchema.optional().default('professional'),
    template: resumeTemplateSchema.optional().default('classic-green'),
  })
  .superRefine((data, ctx) => {
    const phone = data.phone?.trim() || ''
    const email = data.email?.trim() || ''
    if (!phone && !email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请至少填写手机号或邮箱',
        path: ['phone'],
      })
    }
    if (phone && !/^1\d{10}$/.test(phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请输入正确的11位手机号',
        path: ['phone'],
      })
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '邮箱格式不正确',
        path: ['email'],
      })
    }
  })

export const exportResumeSchema = z.object({
  content: z
    .string({ required_error: '导出内容不能为空' })
    .trim()
    .min(1, '导出内容不能为空')
    .max(80000),
  format: z.enum(['pdf', 'xlsx'], { required_error: '请选择 pdf 或 xlsx 格式' }),
  fileName: z.string().max(100).optional().default('我的简历'),
  template: resumeTemplateSchema.optional(),
  photoUrl: z.string().max(500).optional().default(''),
  builderData: z.record(z.unknown()).optional().nullable(),
})
