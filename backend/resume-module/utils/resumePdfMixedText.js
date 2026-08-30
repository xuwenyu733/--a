const { splitTextRuns, pdfLineGap, SIZE_BODY, SIZE_NAME, SIZE_TITLE } = require('./resumeTypography');

function pickFontKey(lang) {
  return lang === 'en' ? 'EN' : 'CN';
}

/**
 * 在同一行/段落内混排中英文字体（微软雅黑 + Calibri）
 */
function writeMixedText(doc, text, options = {}) {
  const {
    x,
    y,
    width,
    size = 11,
    lineGap,
    color = '#111827',
    align,
    indent = 0,
    continued = false,
  } = options;

  const runs = splitTextRuns(text);
  if (!runs.length) return;

  const gap = lineGap != null ? lineGap : pdfLineGap(size);
  const startX = x ?? doc.x;
  const startY = y ?? doc.y;

  runs.forEach((run, i) => {
    doc.font(pickFontKey(run.lang)).fontSize(size).fillColor(color);
    const isLast = i === runs.length - 1;
    const opts = {
      continued: continued || !isLast,
      lineGap: gap,
    };
    if (i === 0) {
      if (width != null) opts.width = width;
      if (align) opts.align = align;
      if (indent) opts.indent = indent;
    }
    if (i === 0 && (x != null || y != null)) {
      doc.text(run.text, startX, startY, opts);
    } else {
      doc.text(run.text, opts);
    }
  });
}

function heightOfMixedText(doc, text, { width, size = 11 }) {
  doc.font('CN').fontSize(size);
  return doc.heightOfString(text, { width, lineGap: pdfLineGap(size) });
}

function nameSizeFromBase(baseSize) {
  return baseSize * (SIZE_NAME / SIZE_BODY);
}

function titleSizeFromBase(baseSize) {
  return baseSize * (SIZE_TITLE / SIZE_BODY);
}

module.exports = {
  writeMixedText,
  heightOfMixedText,
  titleSizeFromBase,
  nameSizeFromBase,
};
