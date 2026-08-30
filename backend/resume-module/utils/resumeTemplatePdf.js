/** PDF 导出 — 与前端三套简历模版对应的版式 */
const { pdfLineGap } = require('./resumeTypography');
const { writeMixedText, heightOfMixedText, titleSizeFromBase, nameSizeFromBase } = require('./resumePdfMixedText');

const PDF_TEMPLATES = {
  'classic-green': {
    accent: '#2d8f4e',
    h2: 'filled',
    h3: 'grayBar',
    h1Color: '#1a1a1a',
  },
  'modern-blue': {
    accent: '#2563eb',
    h2: 'filled',
    h3: 'grayBar',
    h1Color: '#1e293b',
  },
  'sidebar-navy': {
    accent: '#1e3a5f',
    h2: 'filled',
    h3: 'grayBar',
    h1Color: '#1e3a5f',
  },
};

function getPdfTemplate(templateId) {
  return PDF_TEMPLATES[templateId] || null;
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.maxY()) {
    doc.addPage();
  }
}

function renderH2Filled(doc, text, contentWidth, accent, fontSize) {
  const padX = 10;
  const padY = 4;
  const textW = contentWidth - padX * 2;
  const textH = heightOfMixedText(doc, text, { width: textW, size: fontSize });
  const barH = textH + padY * 2;
  ensureSpace(doc, barH + 3);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.save();
  doc.fillColor(accent).rect(x, y, contentWidth, barH).fill();
  writeMixedText(doc, text, {
    x: x + padX,
    y: y + padY,
    width: textW,
    size: fontSize,
    color: '#ffffff',
    lineGap: pdfLineGap(fontSize),
  });
  doc.restore();
  doc.y = y + barH + 4;
  doc.fillColor('#111827');
}

function renderH2Underline(doc, text, contentWidth, accent, fontSize) {
  ensureSpace(doc, fontSize * 2.5);
  writeMixedText(doc, text, {
    width: contentWidth,
    size: fontSize,
    color: accent,
    lineGap: pdfLineGap(fontSize),
  });
  const lineY = doc.y + 2;
  doc.save();
  doc.strokeColor(accent).lineWidth(1.5);
  doc
    .moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.margins.left + contentWidth, lineY)
    .stroke();
  doc.restore();
  doc.moveDown(0.35);
  doc.fillColor('#111827');
}

function renderH3GrayBar(doc, text, contentWidth, fontSize) {
  const padX = 8;
  const padY = 4;
  const textW = contentWidth - padX * 2;
  const textH = heightOfMixedText(doc, text, { width: textW, size: fontSize });
  const barH = textH + padY * 2;
  ensureSpace(doc, barH + 3);
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.save();
  doc.fillColor('#eef1f4').rect(x, y, contentWidth, barH).fill();
  doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(x, y, contentWidth, barH).stroke();
  writeMixedText(doc, text, {
    x: x + padX,
    y: y + padY,
    width: textW,
    size: fontSize,
    lineGap: pdfLineGap(fontSize),
  });
  doc.restore();
  doc.y = y + barH + 4;
}

function renderHeading(doc, item, baseSize, contentWidth, tpl) {
  const titleSize = titleSizeFromBase(baseSize);

  if (item.type === 'h1' && tpl) {
    const nameSize = nameSizeFromBase(baseSize);
    ensureSpace(doc, nameSize * 2);
    writeMixedText(doc, item.text, {
      width: contentWidth,
      size: nameSize,
      color: tpl.h1Color || '#111827',
      lineGap: pdfLineGap(nameSize),
      align: tpl.h1Center ? 'center' : 'left',
    });
    if (tpl.h1Center) doc.moveDown(0.2);
    doc.fillColor('#111827');
    return true;
  }

  if (item.type === 'h2' && tpl) {
    if (tpl.h2 === 'filled') {
      renderH2Filled(doc, item.text, contentWidth, tpl.accent, titleSize);
      return true;
    }
    if (tpl.h2 === 'underline') {
      renderH2Underline(doc, item.text, contentWidth, tpl.accent, titleSize);
      return true;
    }
  }

  if (item.type === 'h3' && tpl) {
    if (tpl.h3 === 'grayBar') {
      renderH3GrayBar(doc, item.text, contentWidth, titleSize);
      return true;
    }
    if (tpl.h3 === 'accent') {
      writeMixedText(doc, item.text, {
        width: contentWidth,
        size: titleSize,
        color: tpl.accent,
        lineGap: pdfLineGap(titleSize),
      });
      doc.fillColor('#111827');
      return true;
    }
  }

  return false;
}

module.exports = {
  PDF_TEMPLATES,
  getPdfTemplate,
  renderHeading,
};
