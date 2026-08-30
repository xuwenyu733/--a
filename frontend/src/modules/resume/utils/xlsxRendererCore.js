/**
 * Excel → HTML 高保真渲染（浏览器 ESM，与 backend/shared-resume 逻辑同步）
 */
import ExcelJS from 'exceljs'

const A4_CONTENT_PX = 718;
const A4_CONTENT_HEIGHT_PX = 1058;

const INDEXED_COLORS = {
  0: '#000000',
  1: '#FFFFFF',
  2: '#FF0000',
  3: '#00FF00',
  4: '#0000FF',
  5: '#FFFF00',
  6: '#FF00FF',
  7: '#00FFFF',
  8: '#000000',
  9: '#FFFFFF',
  10: '#FF0000',
  11: '#00FF00',
  12: '#0000FF',
  13: '#FFFF00',
  14: '#FF00FF',
  15: '#00FFFF',
  16: '#800000',
  17: '#008000',
  18: '#000080',
  19: '#808000',
  20: '#800080',
  21: '#008080',
  22: '#C0C0C0',
  23: '#808080',
  64: '',
};

function bufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    return Buffer.from(buffer).toString('base64');
  }
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  if (typeof btoa !== 'function') {
    throw new Error('bufferToDataUrl: 当前环境不支持 base64 编码');
  }
  return btoa(binary);
}

function bufferToDataUrl(buffer, ext) {
  return `data:image/${ext};base64,${bufferToBase64(buffer)}`;
}

function emuToPx(value) {
  return Math.round(Number(value) / 9525);
}

function ptToPx(pt) {
  return (Number(pt) * 96) / 72;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colLettersToNum(letters) {
  let num = 0;
  for (let i = 0; i < letters.length; i += 1) {
    num = num * 26 + letters.charCodeAt(i) - 64;
  }
  return num;
}

function parseRange(range) {
  const [start, end] = range.split(':');
  const s = start.match(/^([A-Z]+)(\d+)$/);
  const e = end.match(/^([A-Z]+)(\d+)$/);
  if (!s || !e) return null;
  return {
    top: Number(s[2]),
    left: colLettersToNum(s[1]),
    bottom: Number(e[2]),
    right: colLettersToNum(e[1]),
  };
}

function argbToCss(argb) {
  if (argb == null || argb === '') return '';
  const hex = String(argb).replace('#', '').toUpperCase();
  if (hex.length === 6) return `#${hex}`;
  if (hex.length === 8) return `#${hex.slice(2)}`;
  return '';
}

function resolveColor(color) {
  if (!color || typeof color !== 'object') return '';
  if (color.argb) return argbToCss(color.argb);
  if (color.indexed != null) return INDEXED_COLORS[color.indexed] || '';
  return '';
}

function colWidthPx(worksheet, col) {
  const width = worksheet.getColumn(col).width;
  return width ? Math.round(width * 7 + 5) : 64;
}

function getColWidths(worksheet, maxCol) {
  const widths = [];
  for (let c = 1; c <= maxCol; c += 1) widths.push(colWidthPx(worksheet, c));
  const total = widths.reduce((a, b) => a + b, 0);
  if (total > A4_CONTENT_PX) {
    const scale = A4_CONTENT_PX / total;
    return widths.map((w) => Math.max(10, Math.round(w * scale)));
  }
  return widths;
}

function colWidthAt(colWidths, col) {
  return colWidths[col - 1] || 64;
}

function rowHeightPx(worksheet, row) {
  const height = worksheet.getRow(row).height;
  if (height) return Math.round(height * 1.33);
  const def = worksheet.properties?.defaultRowHeight;
  return def ? Math.round(def * 1.33) : 22;
}

function getUsedBounds(worksheet) {
  let maxRow = 1;
  let maxCol = 1;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    maxRow = Math.max(maxRow, rowNumber);
    row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      maxCol = Math.max(maxCol, colNumber);
    });
  });
  return { maxRow, maxCol };
}

function buildMergeMap(worksheet) {
  const map = new Map();
  for (const range of worksheet.model.merges || []) {
    const parsed = parseRange(range);
    if (!parsed) continue;
    for (let r = parsed.top; r <= parsed.bottom; r += 1) {
      for (let c = parsed.left; c <= parsed.right; c += 1) {
        map.set(`${r}:${c}`, {
          masterRow: parsed.top,
          masterCol: parsed.left,
          master: r === parsed.top && c === parsed.left,
          rowspan: parsed.bottom - parsed.top + 1,
          colspan: parsed.right - parsed.left + 1,
        });
      }
    }
  }
  return map;
}

function getMergeRect(mergeMap, row, col) {
  const merge = mergeMap.get(`${row}:${col}`);
  if (!merge) {
    return { top: row, left: col, bottom: row, right: col };
  }
  return {
    top: merge.masterRow,
    left: merge.masterCol,
    bottom: merge.masterRow + merge.rowspan - 1,
    right: merge.masterCol + merge.colspan - 1,
  };
}

function getMasterCell(worksheet, row, col, mergeMap) {
  const merge = mergeMap.get(`${row}:${col}`);
  if (merge && !merge.master) {
    return worksheet.getCell(merge.masterRow, merge.masterCol);
  }
  return worksheet.getCell(row, col);
}

function getFont(cell) {
  return cell.font || cell.style?.font || {};
}

function getFill(cell) {
  return cell.fill || cell.style?.fill || {};
}

function getBorder(cell) {
  return cell.border || cell.style?.border || {};
}

function getAlignment(cell) {
  return cell.alignment || cell.style?.alignment || {};
}

function resolveFill(fill) {
  if (!fill || fill.type === 'gradient') return '';
  if (fill.type === 'pattern') {
    if (fill.pattern === 'none') return '';
    const fg = resolveColor(fill.fgColor);
    if (fg) return fg;
    return resolveColor(fill.bgColor);
  }
  return resolveColor(fill.fgColor) || resolveColor(fill.bgColor);
}

function borderWidth(style) {
  const map = { thin: 1, hair: 1, dotted: 1, dashed: 1, medium: 2, thick: 3, double: 3 };
  return map[style] || 1;
}

function isVisibleBorderColor(color) {
  if (!color) return false;
  const u = color.toUpperCase();
  return u !== '#FFFFFF' && u !== '#FFF';
}

function hasVisibleBorder(border) {
  if (!border) return false;
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const b = border[side];
    if (b?.style && isVisibleBorderColor(resolveColor(b.color))) return true;
  }
  return false;
}

function isEffectivelyEmptyCell(cell) {
  return (
    !cellText(cell).trim() &&
    !resolveFill(getFill(cell)) &&
    !hasVisibleBorder(getBorder(cell))
  );
}

/** 压缩头像列左侧的全空占位列（本模板为 E 列） */
function shrinkGapBeforePortrait(worksheet, maxRow, mergeMap, colWidths, portraitCol) {
  if (portraitCol <= 1) return colWidths;
  const gapCol = portraitCol - 1;
  let empty = true;
  for (let r = 1; r <= Math.min(5, maxRow); r += 1) {
    const merge = mergeMap.get(`${r}:${gapCol}`);
    if (merge && merge.masterCol !== gapCol) continue;
    if (merge && !merge.master) continue;
    if (!isEffectivelyEmptyCell(worksheet.getCell(r, gapCol))) {
      empty = false;
      break;
    }
  }
  if (empty) colWidths[gapCol - 1] = 2;
  return colWidths;
}

function cellText(cell) {
  const value = cell.value;
  if (value == null) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if (value.text) return String(value.text);
    if (value.result != null) return String(value.result);
    if (value.hyperlink) return String(value.text || value.hyperlink);
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('zh-CN');
  }
  return String(value);
}

function fontStyleCss(font) {
  const styles = [];
  if (font.bold) styles.push('font-weight:700');
  if (font.italic) styles.push('font-style:italic');
  if (font.underline) styles.push('text-decoration:underline');
  if (font.size) styles.push(`font-size:${Number(font.size)}pt`);
  if (font.name) {
    const safeName = String(font.name).replace(/'/g, '');
    styles.push(`font-family:'${safeName}','PingFang SC','Microsoft YaHei','SimHei',sans-serif`);
  }
  const color = resolveColor(font.color);
  if (color) styles.push(`color:${color}`);
  return styles;
}

function cellHtml(cell) {
  const value = cell.value;
  const font = getFont(cell);

  if (value && typeof value === 'object' && Array.isArray(value.richText)) {
    return value.richText
      .map((part) => {
        const html = escapeHtml(part.text || '');
        const partFont = { ...font, ...part.font };
        const styles = fontStyleCss(partFont);
        return styles.length ? `<span style="${styles.join(';')}">${html}</span>` : html;
      })
      .join('');
  }

  const text = escapeHtml(cellText(cell));
  if (!text) return '';

  const styles = fontStyleCss(font);
  return styles.length ? `<span style="${styles.join(';')}">${text}</span>` : text;
}

function cellStyleToCss(cell) {
  const font = getFont(cell);
  const fill = getFill(cell);
  const border = getBorder(cell);
  const alignment = getAlignment(cell);

  const styles = [
    'padding:3px 6px',
    'vertical-align:top',
    'word-break:break-word',
    'overflow-wrap:anywhere',
    'white-space:pre-wrap',
    'line-height:1.4',
    'overflow:visible',
  ];

  styles.push(...fontStyleCss(font));

  const bg = resolveFill(fill);
  if (bg) styles.push(`background-color:${bg}`);

  if (alignment.horizontal) {
    styles.push(`text-align:${alignment.horizontal}`);
  }
  if (alignment.vertical) {
    const map = { middle: 'middle', center: 'middle', top: 'top', bottom: 'bottom' };
    styles.push(`vertical-align:${map[alignment.vertical] || 'top'}`);
  }
  if (alignment.wrapText === false) {
    styles.push('white-space:nowrap');
  }

  for (const side of ['top', 'right', 'bottom', 'left']) {
    const b = border[side];
    if (!b?.style) continue;
    const color = resolveColor(b.color);
    if (!isVisibleBorderColor(color)) continue;
    styles.push(`border-${side}:${borderWidth(b.style)}px solid ${color}`);
  }

  return styles.join(';');
}

function sumColWidths(colWidths, fromCol, toCol) {
  let w = 0;
  for (let c = fromCol; c <= toCol; c += 1) w += colWidthAt(colWidths, c);
  return w;
}

function estimateCellHeightPx(cell, cellWidthPx) {
  const text = cellText(cell);
  if (!text.trim()) return 0;

  const font = getFont(cell);
  const fontSizePt = font.size || 8;
  const linePx = ptToPx(fontSizePt) * 1.4;
  const charPx = ptToPx(fontSizePt) * 0.92;
  const charsPerLine = Math.max(6, Math.floor((cellWidthPx - 16) / charPx));

  let totalLines = 0;
  for (const line of text.split('\n')) {
    const len = line.length || 1;
    totalLines += Math.max(1, Math.ceil(len / charsPerLine));
  }
  return Math.ceil(totalLines * linePx + 16);
}

function computeRowHeight(worksheet, row, maxCol, mergeMap, colWidths) {
  let maxH = rowHeightPx(worksheet, row);

  for (let col = 1; col <= maxCol; col += 1) {
    const merge = mergeMap.get(`${row}:${col}`);
    if (merge && !merge.master) continue;

    const rect = getMergeRect(mergeMap, row, col);
    const cell = getMasterCell(worksheet, row, col, mergeMap);
    const cellWidth = sumColWidths(colWidths, rect.left, rect.right);
    maxH = Math.max(maxH, estimateCellHeightPx(cell, cellWidth));
  }

  return Math.ceil(maxH);
}

function findPortraitImage(worksheet, workbook, mergeMap) {
  const images = worksheet.getImages?.() || [];
  for (const item of images) {
    const media = workbook.getImage(item.imageId);
    if (!media?.buffer) continue;
    const tl = item.range?.tl;
    if (!tl) continue;

    const anchorCol = (tl.nativeCol ?? 0) + 1;
    const anchorRow = (tl.nativeRow ?? 0) + 1;
    const rect = getMergeRect(mergeMap, anchorRow, anchorCol);
    const ext = media.extension === 'jpeg' ? 'jpeg' : 'png';

    return {
      cellKey: `${rect.top}:${rect.left}`,
      src: bufferToDataUrl(media.buffer, ext),
    };
  }
  return null;
}

function scaleLayout(colWidths, rowHeights) {
  const totalHeight = rowHeights.reduce((sum, h, idx) => (idx > 0 ? sum + h : sum), 0);
  if (totalHeight <= A4_CONTENT_HEIGHT_PX) {
    return { colWidths, rowHeights, scale: 1 };
  }

  const scale = A4_CONTENT_HEIGHT_PX / totalHeight;
  return {
    colWidths: colWidths.map((w) => Math.max(10, Math.round(w * scale))),
    rowHeights: rowHeights.map((h, idx) => (idx === 0 ? h : Math.max(12, Math.round(h * scale)))),
    scale,
  };
}

async function buildSheetHtml(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { html: '<div class="xlsx-empty">空表格</div>', tableWidth: 0 };

  const mergeMap = buildMergeMap(worksheet);
  const { maxRow, maxCol } = getUsedBounds(worksheet);
  const colWidths = getColWidths(worksheet, maxCol);

  const rowHeights = [0];
  for (let row = 1; row <= maxRow; row += 1) {
    rowHeights[row] = computeRowHeight(worksheet, row, maxCol, mergeMap, colWidths);
  }

  const portrait = findPortraitImage(worksheet, workbook, mergeMap);
  const portraitCol = portrait ? Number(portrait.cellKey.split(':')[1]) : -1;
  shrinkGapBeforePortrait(worksheet, maxRow, mergeMap, colWidths, portraitCol);

  const scaled = scaleLayout(colWidths, rowHeights);
  const finalColWidths = scaled.colWidths;
  const finalRowHeights = scaled.rowHeights;
  const finalTableWidth = finalColWidths.reduce((a, b) => a + b, 0);

  const colgroup = finalColWidths.map((width) => `<col style="width:${width}px" />`).join('');

  let rowsHtml = '';
  for (let row = 1; row <= maxRow; row += 1) {
    const h = finalRowHeights[row];
    rowsHtml += `<tr style="min-height:${h}px">`;
    for (let col = 1; col <= maxCol; col += 1) {
      const merge = mergeMap.get(`${row}:${col}`);
      if (merge && !merge.master) continue;

      const cell = getMasterCell(worksheet, row, col, mergeMap);
      const attrs = [];
      if (merge?.rowspan > 1) attrs.push(`rowspan="${merge.rowspan}"`);
      if (merge?.colspan > 1) attrs.push(`colspan="${merge.colspan}"`);

      const cellKey = `${row}:${col}`;
      const isPortrait = portrait && portrait.cellKey === cellKey;
      const tdClass = isPortrait ? ' class="xlsx-portrait-cell"' : '';
      let tdStyle = cellStyleToCss(cell);

      if (isEffectivelyEmptyCell(cell) && !isPortrait) {
        tdStyle += ';background:#fff;padding:0';
      }

      if (isPortrait) {
        let portraitH = 0;
        for (let r = row; r < row + (merge?.rowspan || 1); r += 1) {
          portraitH += finalRowHeights[r];
        }
        tdStyle += `;height:${portraitH}px;padding:0;vertical-align:middle;text-align:center;background:#fff`;
      }

      const inner = isPortrait
        ? `<div class="xlsx-portrait-wrap"><img class="xlsx-portrait" src="${portrait.src}" alt="" /></div>`
        : cellHtml(cell);

      rowsHtml += `<td${tdClass} style="${tdStyle}" ${attrs.join(' ')}>${inner}</td>`;
    }
    rowsHtml += '</tr>';
  }

  const html = `
    <div class="xlsx-page">
      <div class="xlsx-sheet" style="width:${finalTableWidth}px">
        <table cellspacing="0" cellpadding="0" style="width:${finalTableWidth}px;table-layout:fixed">
          <colgroup>${colgroup}</colgroup>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;

  return { html, tableWidth: finalTableWidth, sheetScale: scaled.scale };
}

const PAGE_STYLES = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; background: #fff; }
  .xlsx-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 8mm 10mm;
    background: #fff;
    position: relative;
    overflow: visible;
    display: flex;
    justify-content: center;
  }
  .xlsx-sheet { position: relative; margin: 0 auto; }
  .xlsx-sheet table {
    border-collapse: collapse;
    table-layout: fixed;
  }
  .xlsx-sheet td { box-sizing: border-box; overflow: visible; word-break: break-word; overflow-wrap: anywhere; }
  .xlsx-sheet tr { height: auto; }
  .xlsx-portrait-cell { padding: 0 !important; vertical-align: middle !important; background: #fff !important; }
  .xlsx-portrait-wrap { width: 100%; height: 100%; overflow: hidden; line-height: 0; }
  .xlsx-portrait {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }
`;

async function renderXlsxPreviewHtml(buffer) {
  const { html } = await buildSheetHtml(buffer);
  return html;
}

async function renderXlsxToHtmlDocument(buffer) {
  const { html } = await buildSheetHtml(buffer);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <style>${PAGE_STYLES}</style>
</head>
<body>${html}</body>
</html>`;
}

export { renderXlsxPreviewHtml, renderXlsxToHtmlDocument, buildSheetHtml }

export default {
  renderXlsxPreviewHtml,
  renderXlsxToHtmlDocument,
  buildSheetHtml,
}
