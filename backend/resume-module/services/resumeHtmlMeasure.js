const { buildResumeHtmlDocument } = require('../utils/resumeMarkdownRender');
const { htmlToPdfBuffer } = require('./resumeHtmlPdfService');
const { countPdfPages } = require('../utils/resumePdfPageCount');

async function measureHtmlResumeLayout(content, templateId, photoUrl, compactLevel = 0) {
  const html = await buildResumeHtmlDocument(content, templateId, photoUrl, compactLevel);
  const pdfBuffer = await htmlToPdfBuffer(html);
  const pages = await countPdfPages(pdfBuffer);

  return {
    pages,
    pageCount: pages,
    isOverflow: pages > 1,
    fitsA4: pages === 1,
    fillRatio: pages > 1 ? 1 : 0.85,
    compactLevel,
  };
}

module.exports = { measureHtmlResumeLayout };
