const { getPdfTemplate, renderHeading } = require('../utils/resumeTemplatePdf');
const { loadResumePhotoBuffer, extractFirstImageSrc } = require('../utils/resolveResumePhoto');
const { exportStyledXlsx } = require('../utils/resumeTemplateXlsx');
const { resolveResumeFonts } = require('../utils/resolveResumeFonts');
const { splitHeaderBody, renderHeaderBlock } = require('../utils/resumePdfHeader');
const { SIZE_BODY, SIZE_TITLE, pdfLineGap } = require('../utils/resumeTypography');
const { writeMixedText, titleSizeFromBase } = require('../utils/resumePdfMixedText');
const logger = require('../utils/logger');

const FORMATS = {
  xlsx: {
    ext: '.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  pdf: { ext: '.pdf', mime: 'application/pdf' },
};

const A4 = { width: 595.28, height: 841.89, margin: 28 };
const TARGET_FONT_SIZE = SIZE_BODY;
const MIN_FONT_SIZE = 7;
const A4_LAYOUT = {
  targetFontSize: TARGET_FONT_SIZE,
  minFillRatio: 0.82,
  maxFillRatio: 0.98,
};

function effectiveTemplateId(templateId) {
  return templateId && ['classic-green', 'modern-blue', 'sidebar-navy'].includes(templateId)
    ? templateId
    : 'classic-green';
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function parseContentLines(content) {
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return { type: 'space' };
      if (trimmed === '---') return { type: 'hr' };
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        return { type: 'image', alt: imgMatch[1], src: imgMatch[2].trim() };
      }
      if (/^[-*]\s*证件照[：:]/i.test(trimmed)) return { type: 'skip' };
      if (trimmed.startsWith('# ')) return { type: 'h1', text: stripMarkdown(trimmed.slice(2)) };
      if (trimmed.startsWith('## ')) return { type: 'h2', text: stripMarkdown(trimmed.slice(3)) };
      if (trimmed.startsWith('### ')) return { type: 'h3', text: stripMarkdown(trimmed.slice(4)) };
      if (/^[-*]\s+/.test(trimmed)) {
        return { type: 'bullet', text: stripMarkdown(trimmed.replace(/^[-*]\s+/, '')) };
      }
      if (trimmed.includes(' | ') && !trimmed.startsWith('#')) {
        return {
          type: 'tableRow',
          cells: trimmed.split(' | ').map((c) => stripMarkdown(c.trim())),
        };
      }
      if (/^\|.+\|$/.test(trimmed)) return { type: 'skip' };
      if (/^[-|: ]+$/.test(trimmed)) return { type: 'skip' };
      return { type: 'body', text: stripMarkdown(trimmed) };
    })
    .filter((item) => item.type !== 'skip');
}

async function exportToXlsx(content, templateId, photoUrl, builderData) {
  const lines = parseContentLines(content);
  return exportStyledXlsx(lines, effectiveTemplateId(templateId), photoUrl, content, builderData);
}

function getStyle(type, baseSize) {
  const titleSize = titleSizeFromBase(baseSize);
  const bodyGap = pdfLineGap(baseSize);
  const titleGap = pdfLineGap(titleSize);
  const map = {
    h1: { size: titleSize, gap: titleGap, before: 0 },
    h2: { size: titleSize, gap: titleGap, before: baseSize * 0.28 },
    h3: { size: titleSize, gap: titleGap, before: baseSize * 0.16 },
    body: { size: baseSize, gap: bodyGap, before: 0 },
    bullet: { size: baseSize, gap: bodyGap, before: 0, indent: 8 },
    tableRow: { size: baseSize, gap: bodyGap * 0.6, before: 0 },
    space: { size: 0, gap: baseSize * LINE_HEIGHT_SPACING(baseSize), before: 0 },
    hr: { size: 0, gap: baseSize * 0.25, before: baseSize * 0.12 },
  };
  return map[type] || map.body;
}

function LINE_HEIGHT_SPACING(baseSize) {
  return (pdfLineGap(baseSize) / Math.max(baseSize, 1)) * 0.85;
}

function renderTableRow(doc, cells, baseSize, contentWidth, style) {
  const colCount = cells.length;
  const colWidth = contentWidth / colCount;
  const fontSize = style.size;
  const rowHeight = fontSize * 1.2 + 6;

  if (doc.y + rowHeight > doc.page.maxY()) {
    doc.addPage();
  }

  const startY = doc.y;
  const startX = doc.page.margins.left;

  cells.forEach((text, index) => {
    const x = startX + colWidth * index;
    doc.save();
    doc.lineWidth(0.5).strokeColor('#e2e8f0').rect(x, startY, colWidth, rowHeight).stroke();
    writeMixedText(doc, text || '', {
      x: x + 4,
      y: startY + 3,
      width: colWidth - 8,
      size: fontSize,
      lineGap: style.gap,
    });
    doc.restore();
  });

  doc.y = startY + rowHeight;
}

function renderPdfContent(doc, lines, baseSize, contentWidth, templateId) {
  const tplId = effectiveTemplateId(templateId);
  const tpl = getPdfTemplate(tplId);

  for (const item of lines) {
    if (item.type === 'image') continue;

    const style = getStyle(item.type, baseSize);
    if (style.before) doc.moveDown(style.before / baseSize);

    if (item.text && ['h1', 'h2', 'h3'].includes(item.type)) {
      if (renderHeading(doc, item, baseSize, contentWidth, tpl)) {
        continue;
      }
    }

    if (item.text) {
      const text = item.type === 'bullet' ? `• ${item.text}` : item.text;
      writeMixedText(doc, text, {
        width: contentWidth - (style.indent || 0),
        size: style.size,
        indent: style.indent || 0,
        lineGap: style.gap,
      });
    } else if (item.type === 'tableRow' && item.cells?.length) {
      renderTableRow(doc, item.cells, baseSize, contentWidth, style);
    } else if (item.type === 'space' || item.type === 'hr') {
      doc.moveDown(style.gap / Math.max(baseSize, 1));
    }
  }
}

function renderPdfBuffer(lines, baseSize, fonts, templateId, photoBuffer) {
  const PDFDocument = require('pdfkit');
  const contentWidth = A4.width - A4.margin * 2;
  const tplId = effectiveTemplateId(templateId);
  const { header, body } = splitHeaderBody(lines);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: A4.margin,
        bottom: A4.margin,
        left: A4.margin,
        right: A4.margin,
      },
      autoFirstPage: true,
      bufferPages: true,
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);

    doc.registerFont('CN', fonts.cn.path);
    doc.registerFont('EN', fonts.en.path);
    doc.font('CN');

    if (header.length) {
      renderHeaderBlock(doc, header, baseSize, contentWidth, tplId, photoBuffer);
    } else if (photoBuffer?.length) {
      const { renderHeaderPhotoAt, photoSizeForTemplate } = require('../utils/resumePhotoPdf');
      renderHeaderPhotoAt(doc, photoBuffer, tplId, contentWidth, doc.y);
      doc.y += photoSizeForTemplate(tplId).h + baseSize * 0.2;
    }

    renderPdfContent(doc, body, baseSize, contentWidth, tplId);

    const topMargin = doc.page.margins.top;
    const maxY = doc.page.maxY();
    const usableHeight = Math.max(maxY - topMargin, 1);
    const fillRatio = Math.min((doc.y - topMargin) / usableHeight, 1);
    const pageCount = doc.bufferedPageRange().count;

    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        layout: {
          fontSize: baseSize,
          pageCount,
          fillRatio: pageCount > 1 ? 1 : fillRatio,
          topMargin,
          maxY,
          finalY: doc.y,
        },
      });
    });
    doc.end();
  });
}

async function loadPhotoBuffer(photoUrl, content) {
  const resolvedPhoto = photoUrl || extractFirstImageSrc(content);
  if (!resolvedPhoto) return null;
  return loadResumePhotoBuffer(resolvedPhoto);
}

async function measurePdfLayout(content, fontSize = TARGET_FONT_SIZE, templateId, photoUrl) {
  const fonts = resolveResumeFonts();
  const lines = parseContentLines(content);
  const photoBuffer = await loadPhotoBuffer(photoUrl, content);
  const { layout } = await renderPdfBuffer(
    lines,
    fontSize,
    fonts,
    templateId,
    photoBuffer
  );

  return {
    fontSize: layout.fontSize,
    pages: layout.pageCount,
    fillRatio: layout.fillRatio,
    isOverflow: layout.pageCount > 1,
    isUnderfilled: layout.pageCount === 1 && layout.fillRatio < A4_LAYOUT.minFillRatio,
    isOverfilled: layout.pageCount === 1 && layout.fillRatio > A4_LAYOUT.maxFillRatio,
    fitsA4:
      layout.pageCount === 1 &&
      layout.fillRatio >= A4_LAYOUT.minFillRatio &&
      layout.fillRatio <= A4_LAYOUT.maxFillRatio,
  };
}

async function exportToPdf(content, templateId, photoUrl, builderData) {
  const tplId = effectiveTemplateId(templateId);

  try {
    const { exportMarkdownToPdf } = require('./resumeHtmlPdfService');
    return await exportMarkdownToPdf(content, tplId, photoUrl, builderData);
  } catch (htmlErr) {
    logger.warn(`HTML 导出 PDF 失败，回退 PDFKit: ${htmlErr.message}`);
  }

  try {
    require.resolve('pdfkit');
  } catch {
    throw new Error('PDF 导出需要 Chrome 或 pdfkit，请安装 Google Chrome 后重试');
  }

  const fonts = resolveResumeFonts();
  const photoBuffer = await loadPhotoBuffer(photoUrl, content);
  const lines = parseContentLines(content);
  let lastResult = null;

  for (let size = TARGET_FONT_SIZE; size >= MIN_FONT_SIZE; size -= 0.25) {
    const result = await renderPdfBuffer(lines, size, fonts, tplId, photoBuffer);
    lastResult = result;
    if (result.layout.pageCount === 1) return result.buffer;
  }

  if (lastResult?.layout?.pageCount > 1) {
    throw new Error('内容超出 A4 单页容量，请精简简历后重试');
  }

  return lastResult.buffer;
}

async function exportResume(content, format, templateId, photoUrl, builderData) {
  const meta = FORMATS[format];
  if (!meta) throw new Error('不支持的导出格式，请选择 pdf 或 xlsx');

  let buffer;
  if (format === 'xlsx') buffer = await exportToXlsx(content, templateId, photoUrl, builderData);
  else if (format === 'pdf') buffer = await exportToPdf(content, templateId, photoUrl, builderData);

  return { buffer, ...meta };
}

module.exports = {
  exportResume,
  FORMATS,
  measurePdfLayout,
  A4_LAYOUT,
  TARGET_FONT_SIZE,
  SIZE_TITLE,
  parseContentLines,
  A4,
};
