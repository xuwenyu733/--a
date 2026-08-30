const { buildResumeHtmlDocument } = require('../utils/resumeMarkdownRender');
const { launchBrowser } = require('../utils/puppeteerLaunch');
const logger = require('../utils/logger');

const A4_USABLE_MM = 260; // A4 297mm - margins

/** 测量内容实际高度（mm） */
async function measureHeightMm(page) {
  return page.evaluate(() => {
    const sheet = document.querySelector('.resume-a4-sheet');
    if (!sheet) return 9999;
    const orig = { maxHeight: sheet.style.maxHeight, overflow: sheet.style.overflow };
    sheet.style.maxHeight = 'none';
    sheet.style.overflow = 'visible';
    const pxPerMm = 96 / 25.4; // ~3.78
    const h = sheet.getBoundingClientRect().height / pxPerMm;
    sheet.style.maxHeight = orig.maxHeight;
    sheet.style.overflow = orig.overflow;
    return h;
  });
}

async function htmlToPdfBuffer(html) {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
          )
      )
    );
    await page.emulateMediaType('print');

    const heightMm = await measureHeightMm(page);
    let scale = 1;
    if (heightMm > A4_USABLE_MM) {
      scale = Math.round((A4_USABLE_MM / heightMm) * 100) / 100;
      if (scale < 0.6) scale = 0.6;
      logger.info(`内容高度 ${heightMm.toFixed(0)}mm > A4 ${A4_USABLE_MM}mm，PDF 缩放 ${(scale * 100).toFixed(0)}%`);
    }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      scale,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function effectiveTemplateId(templateId) {
  return templateId && ['classic-green', 'modern-blue', 'sidebar-navy'].includes(templateId)
    ? templateId
    : 'classic-green';
}

async function exportMarkdownToPdf(content, templateId, photoUrl, builderData = null) {
  const tplId = effectiveTemplateId(templateId);

  for (const level of [0, 1, 2]) {
    const html = await buildResumeHtmlDocument(content, tplId, photoUrl, level, builderData);
    const buffer = await htmlToPdfBuffer(html);

    try {
      const { countPdfPages } = require('../utils/resumePdfPageCount');
      const pages = await countPdfPages(buffer);
      logger.info(`简历 PDF: compactLevel=${level}, pages=${pages}, 模板=${tplId}`);
      if (pages === 1) return buffer;
    } catch (e) {
      logger.warn(`PDF 页数检测失败: ${e.message}`);
      return buffer;
    }
  }

  // Last resort
  const html = await buildResumeHtmlDocument(content, tplId, photoUrl, 2, builderData);
  const buffer = await htmlToPdfBuffer(html);
  logger.info(`简历 PDF 最终导出 ${buffer.length} bytes (compactLevel=2)`);
  return buffer;
}

module.exports = { exportMarkdownToPdf, htmlToPdfBuffer };
