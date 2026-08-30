/** 简历导出排版规范 */

const FONT_CN = 'Microsoft YaHei';
const FONT_EN = 'Calibri';

const SIZE_BODY = 11;
const SIZE_TITLE = 13;
const SIZE_NAME = 14;
const LINE_HEIGHT_RATIO = 1.2;

/** 标准二寸证件照（35mm × 49mm，与表单建议 413×626 同比例） */
const PHOTO_2INCH = {
  mmW: 35,
  mmH: 49,
  get ptW() {
    return (this.mmW * 72) / 25.4;
  },
  get ptH() {
    return (this.mmH * 72) / 25.4;
  },
  get pxW() {
    return Math.round((this.mmW / 25.4) * 96);
  },
  get pxH() {
    return Math.round((this.mmH / 25.4) * 96);
  },
};

/** CJK 与拉丁/数字分段 */
const LATIN_RE = /[A-Za-z0-9\s@._\-+():/|]+/g;

function splitTextRuns(text) {
  if (!text) return [{ text: '', lang: 'cn' }];
  const runs = [];
  let last = 0;
  const s = String(text);
  LATIN_RE.lastIndex = 0;
  let m;
  while ((m = LATIN_RE.exec(s)) !== null) {
    if (m.index > last) {
      runs.push({ text: s.slice(last, m.index), lang: 'cn' });
    }
    if (m[0]) runs.push({ text: m[0], lang: 'en' });
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    runs.push({ text: s.slice(last), lang: 'cn' });
  }
  return runs.length ? runs : [{ text: s, lang: 'cn' }];
}

function fontNameForRun(lang, bold) {
  if (lang === 'en') return FONT_EN;
  return FONT_CN;
}

/** ExcelJS 富文本 */
function toExcelRichText(text, { bold = false, size = SIZE_BODY } = {}) {
  const runs = splitTextRuns(text);
  return {
    richText: runs.map((r) => ({
      text: r.text,
      font: {
        name: fontNameForRun(r.lang, bold),
        size,
        bold,
        charset: r.lang === 'cn' ? 134 : 1,
      },
    })),
  };
}

function setCellRichText(cell, text, options, colorArgb) {
  const val = toExcelRichText(text, options);
  if (colorArgb) {
    val.richText = val.richText.map((r) => ({
      ...r,
      font: { ...r.font, color: { argb: colorArgb } },
    }));
  }
  cell.value = val;
}

/** Excel 行高（pt）：11pt × 1.2 行距 × 行数 */
function excelRowHeightPt(lineCount = 1, fontSize = SIZE_BODY) {
  return Math.max(fontSize * LINE_HEIGHT_RATIO * lineCount, fontSize * LINE_HEIGHT_RATIO);
}

/** PDF lineGap：实现 1.2 倍行距 */
function pdfLineGap(fontSize) {
  return fontSize * (LINE_HEIGHT_RATIO - 1);
}

module.exports = {
  FONT_CN,
  FONT_EN,
  SIZE_BODY,
  SIZE_TITLE,
  SIZE_NAME,
  LINE_HEIGHT_RATIO,
  PHOTO_2INCH,
  splitTextRuns,
  toExcelRichText,
  setCellRichText,
  excelRowHeightPt,
  pdfLineGap,
};
