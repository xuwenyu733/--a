const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { loadResumePhotoBuffer, extractFirstImageSrc } = require('./resolveResumePhoto');
const {
  transformResumeHtml,
  buildMetaGridFromPairs,
  parseContactFromHeadBlock,
  esc,
} = require('./resumeLayoutTransform');
const { buildHeaderMetaFromForm, normalizeResumeHeader, resolveHeaderMeta, headerMetaToGridMap } = require('./normalizeResumeHeader');
const {
  stripPhotoFromMarkdown,
  extractLeadingPhotoHtml,
  removeStrayPhotoBlocks,
  toDataUri,
} = require('./resumePhotoHtml');

marked.setOptions({ gfm: true, breaks: true });

function ensurePhotoInMarkdown(content, photoUrl) {
  if (!photoUrl?.trim() || !content?.trim()) return content || '';
  const raw = photoUrl.trim();
  const norm = raw.startsWith('/') ? raw : `/${raw}`;
  const stripped = norm.replace(/^\//, '');
  if (content.includes(raw) || content.includes(norm) || content.includes(stripped)) {
    return content;
  }
  return `![证件照](${norm})\n\n${content}`;
}

function extractNameFromH1(h1Html) {
  const m = h1Html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1] : '';
}

async function resolvePhotoDataUri(photoUrl, markdown) {
  const resolved = photoUrl?.trim() || extractFirstImageSrc(markdown);
  if (!resolved) return '';
  const buffer = await loadResumePhotoBuffer(resolved);
  return toDataUri(buffer);
}

function splitBodyHtml(work) {
  const h2Idx = work.search(/<h2[\s>]/i);
  if (h2Idx >= 0) return work.slice(h2Idx);
  return work
    .replace(/^<h1[\s\S]*?<\/h1>\s*/i, '')
    .replace(/^\s*<ul[\s\S]*?<\/ul>\s*/i, '')
    .replace(/^\s*<p>[\s\S]*?<\/p>\s*/i, '');
}

function wrapMarkdownHeader(html, photoDataUri, headerMeta) {
  const { photoHtml, rest: work } = extractLeadingPhotoHtml(html, photoDataUri);

  const bodyHtml = splitBodyHtml(work);
  const h2Idx = work.search(/<h2[\s>]/i);
  const headSlice = h2Idx >= 0 ? work.slice(0, h2Idx) : work;
  const name = headerMeta?.name
    ? esc(headerMeta.name)
    : extractNameFromH1(work.match(/<h1[\s\S]*?<\/h1>/i)?.[0] || '');

  const metaGrid = headerMeta
    ? buildMetaGridFromPairs(headerMetaToGridMap(headerMeta))
    : buildMetaGridFromPairs(parseContactFromHeadBlock(headSlice));

  const photoCol = photoHtml
    ? `<div class="resume-markdown-head__photo">${photoHtml}</div>`
    : '';

  return `<div class="resume-markdown-head">
  <div class="resume-markdown-head__main">
    <h1 class="resume-name">${name}</h1>
    ${metaGrid}
  </div>
  ${photoCol}
</div>${removeStrayPhotoBlocks(bodyHtml)}`;
}

function readResumeStyles() {
  const cssPath = path.join(
    __dirname,
    '../../../frontend/src/modules/resume/styles/resume-templates.css'
  );
  return fs.readFileSync(cssPath, 'utf8');
}

const PRINT_CSS = `
@page { size: A4; margin: 0; }
html, body {
  margin: 0;
  padding: 0;
  height: auto !important;
  overflow: visible !important;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.resume-a4-frame { padding: 0 !important; overflow: visible !important; }
.resume-a4-fit-target { overflow: visible !important; height: auto !important; }
.resume-a4-sheet {
  width: 210mm !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  max-width: none !important;
  margin: 0 auto !important;
  padding: 10mm 10mm 12mm !important;
  box-shadow: none !important;
  border: none !important;
  box-sizing: border-box;
  overflow: visible !important;
  page-break-inside: auto !important;
}
.resume-project { overflow: visible !important; }
.resume-markdown-head,
.resume-meta-grid,
.resume-meta-inline {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
/* 防止漏网的 Markdown 图片撑满页面 */
.resume-tpl__doc.markdown-body > p:only-child:has(img),
.resume-tpl__doc.markdown-body > p > img:only-child {
  display: none !important;
}
`;

function compactPrintCss(level) {
  if (!level) return '';
  return `
.resume-a4-sheet--c${level} {
  padding: ${level >= 2 ? '7mm 8mm 8mm' : '8mm 9mm 9mm'} !important;
}
.resume-a4-sheet--c${level} .resume-tpl,
.resume-a4-sheet--c${level} .markdown-body {
  font-size: ${level >= 3 ? '9.5pt' : level >= 2 ? '10pt' : '10.5pt'} !important;
  line-height: 1.12 !important;
}
.resume-a4-sheet--c${level} .resume-section { margin-bottom: ${level >= 2 ? 4 : 6}px !important; }
.resume-a4-sheet--c${level} .resume-section__title { padding: 3px 10px !important; font-size: 12pt !important; }
.resume-a4-sheet--c${level} .resume-project { margin-bottom: ${level >= 2 ? 4 : 5}px !important; }
.resume-a4-sheet--c${level} .resume-project__body { padding: 4px 2px 5px !important; }
.resume-a4-sheet--c${level} .resume-project__body p,
.resume-a4-sheet--c${level} .resume-project__body li { margin: 0 0 2px !important; }
.resume-a4-sheet--c${level} .markdown-body ul { margin: 2px 0 4px !important; }
.resume-a4-sheet--c${level} .markdown-body h2 { margin-top: ${level >= 2 ? 5 : 6}px !important; }
.resume-a4-sheet--c${level} .resume-markdown-head { margin-bottom: ${level >= 2 ? 6 : 8}px !important; }
`;
}

async function buildResumeHtmlDocument(
  content,
  templateId = 'classic-green',
  photoUrl = '',
  compactLevel = 0,
  builderData = null
) {
  const tpl = ['classic-green', 'modern-blue', 'sidebar-navy'].includes(templateId)
    ? templateId
    : 'classic-green';
  const compactClass =
    compactLevel > 0 ? ` resume-a4-sheet--c${Math.min(compactLevel, 2)}` : '';

  let markdown = content?.trim() || '';
  const headerMeta = resolveHeaderMeta(markdown, builderData, photoUrl);
  if (headerMeta) markdown = normalizeResumeHeader(markdown, headerMeta);
  if (photoUrl) markdown = ensurePhotoInMarkdown(markdown, photoUrl);
  markdown = stripPhotoFromMarkdown(markdown);

  const photoDataUri = await resolvePhotoDataUri(photoUrl, content);

  let bodyHtml = marked.parse(markdown);
  bodyHtml = wrapMarkdownHeader(bodyHtml, photoDataUri, headerMeta);
  bodyHtml = transformResumeHtml(bodyHtml);

  const resumeCss = readResumeStyles();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${resumeCss}\n${PRINT_CSS}\n${compactPrintCss(compactLevel)}</style>
</head>
<body>
  <div class="resume-tpl resume-tpl--${tpl}">
    <div class="resume-a4-frame">
      <div class="resume-a4-sheet${compactClass}">
        <div class="resume-a4-fit-target">
          <div class="resume-tpl__doc markdown-body">${bodyHtml}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  buildResumeHtmlDocument,
  ensurePhotoInMarkdown,
};
