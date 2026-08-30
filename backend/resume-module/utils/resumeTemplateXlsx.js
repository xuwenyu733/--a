const { getPdfTemplate } = require('./resumeTemplatePdf');
const { loadResumePhotoBuffer, extractFirstImageSrc } = require('./resolveResumePhoto');
const { splitHeaderBody } = require('./resumePdfHeader');
const {
  resolveHeaderMeta,
  headerMetaToGridMap,
} = require('./normalizeResumeHeader');
const {
  SIZE_BODY,
  SIZE_TITLE,
  SIZE_NAME,
  FONT_CN,
  PHOTO_2INCH,
  setCellRichText,
  excelRowHeightPt,
} = require('./resumeTypography');

const COL_SPAN = 6;
const PHOTO_COL_START = 5;
const PHOTO_COL_END = 6;
const GRAY_BAR = 'FFEEF1F4';
const BORDER_COLOR = 'FFD0D5DD';
const WHITE = 'FFFFFFFF';

const META_ROWS = [
  ['年龄', '电话'],
  ['专业', '邮箱'],
  ['学历', '毕业院校'],
  ['优势', '毕业时间'],
];

function hexToArgb(hex) {
  const h = (hex || '#2d8f4e').replace('#', '');
  return `FF${h.toUpperCase()}`;
}

function imageExtension(buffer) {
  if (!buffer?.length) return 'jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
  return 'jpeg';
}

function mergeCells(ws, rowNum, fromCol, toCol) {
  try {
    ws.mergeCells(rowNum, fromCol, rowNum, toCol);
  } catch {
    /* ignore */
  }
}

function mergeRow(ws, rowNum, fromCol = 1, toCol = COL_SPAN) {
  mergeCells(ws, rowNum, fromCol, toCol);
}

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  };
}

function applyBorderRange(ws, rowNum, fromCol = 1, toCol = COL_SPAN) {
  for (let c = fromCol; c <= toCol; c += 1) {
    ws.getRow(rowNum).getCell(c).border = thinBorder();
  }
}

function estimateLines(text, charsPerLine = 48) {
  return Math.max(1, Math.ceil(String(text || '').length / charsPerLine));
}

/** Excel 列宽单位 → 像素（近似） */
function columnWidthToPx(width = 11) {
  return Math.round(width * 7 + 5);
}

/** 根据页眉行高与照片列宽计算证件照尺寸，避免压到正文 */
function measureHeaderPhotoBox(ws, headerStartRow, headerEndRow) {
  let heightPt = 0;
  for (let r = headerStartRow; r <= headerEndRow; r += 1) {
    heightPt += ws.getRow(r).height || excelRowHeightPt(1, SIZE_BODY);
  }

  const maxH = Math.max(Math.round((heightPt * 96) / 72) - 10, 52);
  const maxW =
    columnWidthToPx(ws.getColumn(PHOTO_COL_START).width) +
    columnWidthToPx(ws.getColumn(PHOTO_COL_END).width) -
    12;

  const ratio = PHOTO_2INCH.mmW / PHOTO_2INCH.mmH;
  let imgH = maxH;
  let imgW = Math.round(imgH * ratio);
  if (imgW > maxW) {
    imgW = maxW;
    imgH = Math.round(imgW / ratio);
  }

  const totalColPx =
    columnWidthToPx(ws.getColumn(PHOTO_COL_START).width) +
    columnWidthToPx(ws.getColumn(PHOTO_COL_END).width);
  const leftPadPx = Math.max(totalColPx - imgW - 6, 0);
  const tlCol = PHOTO_COL_START - 1 + leftPadPx / columnWidthToPx(ws.getColumn(PHOTO_COL_START).width);

  return {
    width: imgW,
    height: imgH,
    tl: {
      col: Math.min(tlCol, PHOTO_COL_END - 0.15),
      row: headerStartRow - 1 + 0.06,
    },
  };
}

function richFont({ bold = false, size = SIZE_BODY, colorArgb = null } = {}) {
  const font = { name: FONT_CN, size, bold, charset: 134 };
  if (colorArgb) font.color = { argb: colorArgb };
  return font;
}

/** 支持 【标签】与 **加粗** 混排 */
function setCellBodyText(cell, text, { size = SIZE_BODY, bold = false, colorArgb = null } = {}) {
  const raw = String(text || '').trim();
  if (!raw) {
    cell.value = '';
    return;
  }

  const tagLead = raw.match(/^(【[^】]+】)\s*([\s\S]*)$/);
  if (tagLead) {
    const runs = [{ text: tagLead[1], font: richFont({ bold: true, size, colorArgb }) }];
    if (tagLead[2]) runs.push(...inlineBoldRuns(tagLead[2], { size, colorArgb }));
    cell.value = { richText: runs };
    return;
  }

  if (raw.includes('**')) {
    cell.value = { richText: inlineBoldRuns(raw, { size, bold, colorArgb }) };
    return;
  }

  setCellRichText(cell, raw, { bold, size }, colorArgb);
}

function inlineBoldRuns(text, { size = SIZE_BODY, bold = false, colorArgb = null } = {}) {
  const runs = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      runs.push({
        text: text.slice(last, m.index),
        font: richFont({ bold, size, colorArgb }),
      });
    }
    runs.push({
      text: m[1],
      font: richFont({ bold: true, size, colorArgb }),
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    runs.push({
      text: text.slice(last),
      font: richFont({ bold, size, colorArgb }),
    });
  }
  return runs.length ? runs : [{ text, font: richFont({ bold, size, colorArgb }) }];
}

function parseH3Title(text) {
  const parts = String(text || '')
    .split('|')
    .map((s) => s.trim());
  return {
    name: parts[0] || String(text || ''),
    role: parts[1] || '',
    date: parts[2] || '',
  };
}

function isCategoryLine(text) {
  return /^【[^】]+】\s*$/.test(String(text || '').trim());
}

function markPhotoPlaceholder(ws, rowNum) {
  for (let c = PHOTO_COL_START; c <= PHOTO_COL_END; c += 1) {
    const cell = ws.getRow(rowNum).getCell(c);
    cell.value = '';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
    cell.border = thinBorder();
  }
}

function renderMetaCell(cell, label, value, { size = SIZE_BODY } = {}) {
  const labelText = `${label}：`;
  cell.value = {
    richText: [
      { text: labelText, font: richFont({ bold: true, size }) },
      { text: value || '', font: richFont({ size }) },
    ],
  };
}

function renderHeaderBlock(ws, startRow, meta, tpl, workbook) {
  let rowNum = startRow;
  const accentArgb = hexToArgb(tpl.accent);
  const nameColor = hexToArgb(tpl.h1Color || tpl.accent);
  const map = headerMetaToGridMap(meta);

  const nameRow = ws.getRow(rowNum);
  mergeCells(ws, rowNum, 1, 4);
  setCellRichText(nameRow.getCell(1), meta.name || '', {
    bold: true,
    size: SIZE_NAME + 2,
  }, nameColor);
  nameRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  nameRow.height = excelRowHeightPt(1.2, SIZE_NAME + 2);
  applyBorderRange(ws, rowNum, 1, 4);
  mergeCells(ws, rowNum, PHOTO_COL_START, PHOTO_COL_END);
  markPhotoPlaceholder(ws, rowNum);
  rowNum += 1;

  for (const [leftKey, rightKey] of META_ROWS) {
    const row = ws.getRow(rowNum);
    mergeCells(ws, rowNum, 1, 2);
    mergeCells(ws, rowNum, 3, 4);
    mergeCells(ws, rowNum, PHOTO_COL_START, PHOTO_COL_END);

    renderMetaCell(row.getCell(1), leftKey, map[leftKey] || '');
    renderMetaCell(row.getCell(3), rightKey, map[rightKey] || '');

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    row.height = excelRowHeightPt(1, SIZE_BODY);
    applyBorderRange(ws, rowNum, 1, 4);
    markPhotoPlaceholder(ws, rowNum);
    rowNum += 1;
  }

  const headerEndRow = rowNum - 1;
  return { nextRow: rowNum, headerStartRow: startRow, headerEndRow, accentArgb };
}

function renderSectionTitle(ws, rowNum, text, accentArgb) {
  const row = ws.getRow(rowNum);
  mergeRow(ws, rowNum);
  setCellRichText(row.getCell(1), text, { bold: true, size: SIZE_TITLE }, WHITE);
  row.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: accentArgb },
  };
  row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  row.height = excelRowHeightPt(1.15, SIZE_TITLE);
  applyBorderRange(ws, rowNum);
  return rowNum + 1;
}

function renderGrayBar(ws, rowNum, { left = '', center = '', right = '', full = '' } = {}) {
  const row = ws.getRow(rowNum);

  if (full) {
    mergeRow(ws, rowNum);
    setCellBodyText(row.getCell(1), full, { bold: true, size: SIZE_BODY });
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: false };
  } else {
    mergeCells(ws, rowNum, 1, 2);
    mergeCells(ws, rowNum, 3, 4);
    mergeCells(ws, rowNum, 5, COL_SPAN);
    setCellRichText(row.getCell(1), left, { bold: true, size: SIZE_BODY });
    setCellRichText(row.getCell(3), center, { bold: false, size: SIZE_BODY });
    setCellRichText(row.getCell(5), right, { bold: false, size: SIZE_BODY });
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  }

  for (let c = 1; c <= COL_SPAN; c += 1) {
    const cell = row.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY_BAR } };
    cell.border = thinBorder();
  }
  row.height = excelRowHeightPt(1.05, SIZE_BODY);
  return rowNum + 1;
}

function renderBodyRow(ws, rowNum, text, { indent = 1 } = {}) {
  const row = ws.getRow(rowNum);
  mergeRow(ws, rowNum);
  setCellBodyText(row.getCell(1), text, { size: SIZE_BODY });
  row.getCell(1).alignment = { wrapText: true, vertical: 'top', horizontal: 'left', indent };
  row.height = excelRowHeightPt(estimateLines(text), SIZE_BODY);
  applyBorderRange(ws, rowNum);
  return rowNum + 1;
}

function renderBulletRow(ws, rowNum, text) {
  const line = text.startsWith('•') ? text : `• ${text}`;
  return renderBodyRow(ws, rowNum, line, { indent: 2 });
}

function renderTableRow(ws, rowNum, cells) {
  if (cells.length >= 3) {
    return renderGrayBar(ws, rowNum, {
      left: cells[0] || '',
      center: cells[1] || '',
      right: cells.slice(2).join(' | ') || '',
    });
  }
  const text = cells.join(' | ');
  return renderBodyRow(ws, rowNum, text);
}

async function exportStyledXlsx(lines, templateId, photoUrl, content, builderData = null) {
  const ExcelJS = require('exceljs');
  const tpl = getPdfTemplate(templateId) || getPdfTemplate('classic-green');
  const accentArgb = hexToArgb(tpl.accent);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('简历', {
    properties: { defaultRowHeight: excelRowHeightPt(1) },
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.45, right: 0.45, top: 0.4, bottom: 0.4, header: 0, footer: 0 },
    },
  });

  ws.columns = [
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
  ];

  const { header, body } = splitHeaderBody(lines);
  const meta = resolveHeaderMeta(content, builderData, photoUrl);
  let rowNum = 1;

  if (meta?.name) {
    const headerInfo = renderHeaderBlock(ws, rowNum, meta, tpl, workbook);
    rowNum = headerInfo.nextRow;

    const resolvedPhoto = photoUrl || meta.photoUrl || extractFirstImageSrc(content);
    if (resolvedPhoto) {
      const photoBuffer = await loadResumePhotoBuffer(resolvedPhoto);
      if (photoBuffer?.length) {
        try {
          const imageId = workbook.addImage({
            buffer: photoBuffer,
            extension: imageExtension(photoBuffer),
          });
          const photoBox = measureHeaderPhotoBox(
            ws,
            headerInfo.headerStartRow,
            headerInfo.headerEndRow
          );
          ws.addImage(imageId, {
            tl: photoBox.tl,
            ext: { width: photoBox.width, height: photoBox.height },
            editAs: 'oneCell',
          });
        } catch {
          /* ignore */
        }
      }
    }
  } else {
    for (const item of header) {
      if (item.type === 'h1') {
        rowNum = renderBodyRow(ws, rowNum, item.text);
      } else if (item.type === 'bullet' || item.type === 'body') {
        rowNum = renderBodyRow(ws, rowNum, item.text);
      } else if (item.type === 'tableRow') {
        rowNum = renderTableRow(ws, rowNum, item.cells);
      }
    }
  }

  for (const item of body) {
    if (item.type === 'image' || item.type === 'skip') continue;
    if (item.type === 'space') {
      rowNum += 1;
      continue;
    }
    if (item.type === 'hr') continue;

    if (item.type === 'h1') {
      rowNum = renderBodyRow(ws, rowNum, item.text);
      continue;
    }

    if (item.type === 'h2') {
      rowNum = renderSectionTitle(ws, rowNum, item.text, accentArgb);
      continue;
    }

    if (item.type === 'h3') {
      const { name, role, date } = parseH3Title(item.text);
      rowNum = renderGrayBar(ws, rowNum, { left: name, center: role, right: date });
      continue;
    }

    if (item.type === 'bullet') {
      if (isCategoryLine(item.text)) {
        rowNum = renderGrayBar(ws, rowNum, { full: item.text.trim() });
      } else {
        rowNum = renderBulletRow(ws, rowNum, item.text);
      }
      continue;
    }

    if (item.type === 'tableRow') {
      rowNum = renderTableRow(ws, rowNum, item.cells);
      continue;
    }

    if (item.type === 'body') {
      if (isCategoryLine(item.text)) {
        rowNum = renderGrayBar(ws, rowNum, { full: item.text.trim() });
      } else {
        rowNum = renderBodyRow(ws, rowNum, item.text);
      }
    }
  }

  ws.views = [{ showGridLines: false }];
  return workbook.xlsx.writeBuffer();
}

module.exports = { exportStyledXlsx };
