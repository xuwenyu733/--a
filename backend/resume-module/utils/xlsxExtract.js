const XLSX = require('xlsx');

/**
 * 将 Excel 转为结构化文本，供 AI 优化使用（比 CSV 更易读）
 */
function extractXlsxText(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const parts = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet['!ref']) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    const sheetLines = [`## ${sheetName}`];

    for (const row of rows) {
      const cells = row
        .map((cell) => String(cell ?? '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (!cells.length) continue;

      if (cells.length === 1) {
        sheetLines.push(cells[0]);
      } else {
        sheetLines.push(cells.join(' | '));
      }
    }

    if (sheetLines.length > 1) {
      parts.push(sheetLines.join('\n'));
    }
  }

  return parts.join('\n\n');
}

module.exports = { extractXlsxText };
