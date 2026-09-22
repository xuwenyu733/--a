import {
  buildDraftFromForm,
  buildGeneratePrompt,
  RESUME_GENERATE_SYSTEM_PROMPT,
} from '../utils/resumeBuilderPrompt.js'
import { ensurePhotoInMarkdown } from '../utils/resumePhotoMarkdown.js'
import { persistUploadedFiles, pathsToPublicUrls } from '../services/storageService.js'
import { resumeReq } from '../utils/resumeModule.js'
import { ErrorCodes, fail, success } from '../utils/response.js'

const { optimizeResume } = resumeReq('./services/aiService.js')
const { fitContentToA4 } = resumeReq('./services/a4FitService.js')
const { buildHeaderMetaFromForm, normalizeResumeHeader } = resumeReq('./utils/normalizeResumeHeader.js')
const { clientMessage } = resumeReq('./utils/safeError.js')
const { measurePdfLayout } = resumeReq('./services/exportService.js')

export async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, ErrorCodes.BAD_REQUEST, '请上传证件照')
    }
    const paths = await persistUploadedFiles([req.file])
    const urls = pathsToPublicUrls(paths)
    return success(res, { path: paths[0], url: urls[0] }, '上传成功')
  } catch (err) {
    next(err)
  }
}

export async function generateFromForm(req, res, next) {
  try {
    const body = req.body || {}
    const photoUrl = body.photoUrl || ''
    const draft = buildDraftFromForm({ ...body, photoUrl })
    const prompt = buildGeneratePrompt({
      draft,
      jobDescription: body.jobDescription,
      style: body.style || 'professional',
      template: body.template || 'classic-green',
      photoUrl,
    })

    const result = await optimizeResume(prompt, {
      systemPrompt: RESUME_GENERATE_SYSTEM_PROMPT,
    })

    let optimizedContent = result.optimizedContent
    const suggestions = result.suggestions || []
    const templateId = body.template || 'classic-green'

    const headerMeta = buildHeaderMetaFromForm({ ...body, photoUrl })
    if (headerMeta) {
      optimizedContent = normalizeResumeHeader(optimizedContent, headerMeta)
    }

    if (photoUrl) {
      optimizedContent = ensurePhotoInMarkdown(optimizedContent, photoUrl)
    }

    let a4Adjusted = false
    let a4Metrics = null
    try {
      const fitted = await fitContentToA4(optimizedContent, { templateId, photoUrl })
      optimizedContent = fitted.content
      a4Adjusted = Boolean(fitted.a4Adjusted)
      if (headerMeta) {
        optimizedContent = normalizeResumeHeader(optimizedContent, headerMeta)
      }
      if (photoUrl) {
        optimizedContent = ensurePhotoInMarkdown(optimizedContent, photoUrl)
      }
    } catch (fitErr) {
      console.warn('A4 fit skipped:', fitErr.message)
    }

    try {
      const layout = await measurePdfLayout(optimizedContent, undefined, templateId, photoUrl)
      a4Metrics = {
        fontSize: layout.fontSize,
        pages: layout.pages,
        fillRatio: layout.fillRatio,
        isOverflow: layout.isOverflow,
        fitsA4: layout.fitsA4,
      }
    } catch (layoutErr) {
      console.warn('A4 layout measurement failed:', layoutErr.message)
    }

    return success(res, {
      optimizedContent,
      suggestions,
      a4Metrics,
      a4Adjusted,
      draft,
      builderData: body,
    })
  } catch (err) {
    const msg = clientMessage(err, 'AI 生成失败，请检查 API 配置')
    const isConfig =
      /API[_\s-]?KEY|未配置|OPENAI|服务未就绪|暂不可用/i.test(String(err?.message || msg))
    return res.status(isConfig ? 503 : 500).json({
      code: isConfig ? 50300 : 50000,
      message: msg,
      data: null,
    })
  }
}
