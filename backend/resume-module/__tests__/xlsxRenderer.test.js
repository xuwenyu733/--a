const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderXlsxPreviewHtml, buildSheetHtml } = require('../../../shared/xlsxRenderer.cjs');

const SAMPLE_CANDIDATES = [
  process.env.SAMPLE_XLSX,
  path.resolve(__dirname, '../../../../@徐文宇的简历.xlsx'),
].filter(Boolean);

function resolveSamplePath() {
  for (const p of SAMPLE_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

describe('xlsxRenderer', () => {
  const samplePath = resolveSamplePath();

  it('renders sample xlsx with portrait and table structure', async (t) => {
    if (!samplePath) {
      t.skip('未找到示例 xlsx，可设置 SAMPLE_XLSX 环境变量');
      return;
    }

    const buffer = fs.readFileSync(samplePath);
    const html = await renderXlsxPreviewHtml(buffer);

    assert.match(html, /xlsx-page/);
    assert.match(html, /xlsx-sheet/);
    assert.match(html, /table-layout:fixed/);
    assert.doesNotMatch(html, /transform:\s*scale/);

    const { tableWidth } = await buildSheetHtml(buffer);
    assert.ok(tableWidth > 400 && tableWidth <= 718, `tableWidth=${tableWidth}`);
  });
});
