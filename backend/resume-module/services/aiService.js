const OpenAI = require('openai')
const logger = require('../utils/logger')

let client = null

function applySslWorkaround() {
  if (process.env.ALLOW_INSECURE_SSL === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    logger.warn('已启用 ALLOW_INSECURE_SSL，仅建议在本地开发使用')
  }
}

applySslWorkaround()

function normalizeBaseURL(url) {
  const base = (url || 'https://api.openai.com/v1').replace(/\/+$/, '')
  return base.endsWith('/v1') ? base : `${base}/v1`
}

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('请在 backend/.env 中配置 OPENAI_API_KEY（可参考 backend/.env.example）')
    }
    client = new OpenAI({
      apiKey,
      baseURL: normalizeBaseURL(process.env.OPENAI_BASE_URL),
      timeout: 120000,
    })
  }
  return client
}

const DEFAULT_SYSTEM_PROMPT =
  '你是专业的简历优化助手。必须返回合法 JSON，包含 optimizedContent 和 suggestions 字段。保留真实信息，措辞精炼，不要编造经历。'

async function optimizeResume(prompt, options = {}) {
  const openai = getClient()
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const systemContent = options.systemPrompt || DEFAULT_SYSTEM_PROMPT

  logger.info(`调用 AI 模型: ${model}`)

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('AI 返回内容为空')

    const parsed = JSON.parse(raw)
    if (!parsed.optimizedContent) {
      throw new Error('AI 返回格式不正确，缺少 optimizedContent')
    }

    return {
      optimizedContent: parsed.optimizedContent,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    }
  } catch (err) {
    const detail =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.message ||
      'AI 请求失败'
    logger.error(`AI 调用详情: ${detail}`)
    throw new Error(detail)
  }
}

module.exports = { optimizeResume }
