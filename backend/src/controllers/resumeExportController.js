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
    // ZIP/OLE 魔数：合法 xlsx 为 PK\x03\x04；旧版 xls 为 D0 CF 11 E0
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b
    const isOle =
      buffer.length >= 4 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    if (!isZip && !isOle) {
      return res.status(400).json({ success: false, message: '文件内容不是有效的 Excel' })
    }
    if (ext === '.xlsx' || isZip) {
      try {
        const ExcelJS = (await import('exceljs')).default
        await new ExcelJS.Workbook().xlsx.load(buffer)
      } catch {
        return res.status(400).json({ success: false, message: '无法解析 Excel 文件' })
      }
    }

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
