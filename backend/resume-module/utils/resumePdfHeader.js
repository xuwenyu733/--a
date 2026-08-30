const { renderHeaderPhotoAt, photoSizeForTemplate } = require('./resumePhotoPdf');
const { pdfLineGap } = require('./resumeTypography');
const { writeMixedText, nameSizeFromBase } = require('./resumePdfMixedText');
const { getPdfTemplate } = require('./resumeTemplatePdf');

/** 跳过文首证件照行 */
function skipLeadingNoise(lines) {
  let i = 0;
  while (i < lines.length && ['image', 'space', 'hr'].includes(lines[i].type)) {
    i += 1;
  }
  return i;
}

/** 拆分页眉（姓名 + 联系方式）与正文 */
function splitHeaderBody(lines) {
  const start = skipLeadingNoise(lines);
  const header = [];
  const body = [];
  let i = start;

  if (i < lines.length && lines[i].type === 'h1') {
    header.push(lines[i]);
    i += 1;
    while (i < lines.length) {
      const item = lines[i];
      if (item.type === 'h2') break;
      if (item.type === 'bullet' || item.type === 'body' || item.type === 'tableRow') {
        header.push(item);
        i += 1;
        continue;
      }
      if (item.type === 'space') {
        i += 1;
        continue;
      }
      break;
    }
  }

  body.push(...lines.slice(i));
  return { header, body };
}

function renderHeaderBlock(doc, headerLines, baseSize, contentWidth, templateId, photoBuffer) {
  if (!headerLines.length) return 0;

  const tpl = getPdfTemplate(templateId) || getPdfTemplate('classic-green');
  const startY = doc.y;
  const leftX = doc.page.margins.left;
  let photoReserved = 0;
  let photoBottom = startY;

  if (photoBuffer?.length) {
    photoReserved = renderHeaderPhotoAt(doc, photoBuffer, templateId, contentWidth, startY);
    photoBottom = startY + photoSizeForTemplate(templateId).h;
  }

  const textWidth = Math.max(contentWidth - photoReserved, contentWidth * 0.5);
  const nameSize = nameSizeFromBase(baseSize);
  const contactGap = pdfLineGap(baseSize) * 0.55;
  let contactStartY = startY;

  for (const item of headerLines) {
    if (item.type === 'h1') {
      writeMixedText(doc, item.text, {
        x: leftX,
        y: startY,
        width: textWidth,
        size: nameSize,
        color: tpl.h1Color || '#111827',
        lineGap: pdfLineGap(nameSize),
      });
      contactStartY = doc.y + baseSize * 0.35;
      doc.y = contactStartY;
      continue;
    }

    if (item.type === 'bullet' || item.type === 'body') {
      const text = item.type === 'bullet' ? `• ${item.text}` : item.text;
      writeMixedText(doc, text, {
        width: textWidth,
        size: baseSize,
        lineGap: contactGap,
      });
      continue;
    }

    if (item.type === 'tableRow' && item.cells?.length) {
      const text = item.cells.join(' | ');
      writeMixedText(doc, text, {
        width: textWidth,
        size: baseSize,
        lineGap: contactGap,
      });
    }
  }

  doc.y = Math.max(doc.y, photoBottom) + baseSize * 0.2;
  doc.fillColor('#111827');
  return photoReserved;
}

module.exports = {
  splitHeaderBody,
  renderHeaderBlock,
};
