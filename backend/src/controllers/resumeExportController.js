import logger from '../utils/logger.js'
import { resumeReq } from '../utils/resumeModule.js'
import fs from 'fs/promises'
import path from 'path'

const { exportResume: exportResumeService } = resumeReq('./services/exportService.js')
const { exportXlsxToPdf } = resumeReq('./services/xlsxToPdfService.js')
const { clientMessage } = resumeReq('./utils/safeError.js')

function decodeFileName(name) {
  try {
    return Buffer.from(name, 'latin1').toString('utf8')
  } catch {
    return name
  }
}

async function safeUnlink(filePath) {
  try {
    await fs.unlink(filePath)
  } catch {
    /* ignore */
  }
}

export async function exportResume(req, res) {
  const { content, format, fileName = '我的简历', template, photoUrl, builderData } = req.body

  try {
    const { buffer, mime, ext } = await exportResumeService(
      content.trim(),
      format,
      template,
      photoUrl?.trim() || '',
      builderData || null
    )
    const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_')

    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(safeName + ext)}`
    )
    res.send(buffer)
  } catch (err) {
    logger.error(`简历导出失败: ${err.message}`)
    res.status(500).json({ success: false, message: clientMessage(err, '导出失败') })
  }
}

export async function exportXlsxAsPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '请上传 Excel 文件' })
  }

  const { path: filePath, originalname } = req.file
  const ext = path.extname(originalname || '').toLowerCase()

  if (!['.xlsx', '.xls'].includes(ext)) {
    await safeUnlink(filePath)
    return res.status(400).json({ success: false, message: '仅支持 .xlsx / .xls 文件' })
  }

  try {
    const buffer = await fs.readFile(filePath)
    const pdfBuffer = await exportXlsxToPdf(buffer)
    const baseName = decodeFileName(originalname).replace(/\.[^.]+$/, '') || '简历'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(`${baseName}.pdf`)}`
    )
    res.send(pdfBuffer)
  } catch (err) {
    logger.error(`Excel 转 PDF 失败: ${err.message}`)
    res.status(500).json({ success: false, message: clientMessage(err, 'Excel 转 PDF 失败') })
  } finally {
    await safeUnlink(filePath)
  }
}
