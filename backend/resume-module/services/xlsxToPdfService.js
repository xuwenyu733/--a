const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { renderXlsxToHtmlDocument } = require('../utils/xlsxToHtml');

const execFileAsync = promisify(execFile);

const LIBREOFFICE_PATHS = [
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/libreoffice',
  '/usr/bin/soffice',
  'soffice',
];

async function findLibreOffice() {
  for (const candidate of LIBREOFFICE_PATHS) {
    try {
      await execFileAsync(candidate, ['--version'], { timeout: 5000 });
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function convertWithLibreOffice(buffer) {
  const soffice = await findLibreOffice();
  if (!soffice) return null;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-xlsx-'));
  const inputPath = path.join(tmpDir, 'resume.xlsx');
  const pdfPath = path.join(tmpDir, 'resume.pdf');

  try {
    await fs.writeFile(inputPath, buffer);
    await execFileAsync(
      soffice,
      ['--headless', '--nologo', '--nofirststartwizard', '--convert-to', 'pdf', '--outdir', tmpDir, inputPath],
      { timeout: 90000 }
    );
    return await fs.readFile(pdfPath);
  } catch (err) {
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function convertWithPuppeteer(buffer) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch {
    throw new Error('Excel 转 PDF 需要 puppeteer-core，请在 backend 目录运行: npm install puppeteer-core');
  }

  const chromePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);

  let executablePath = null;
  for (const p of chromePaths) {
    try {
      await fs.access(p);
      executablePath = p;
      break;
    } catch {
      /* next */
    }
  }

  if (!executablePath) {
    throw new Error(
      '未找到 Chrome 浏览器，请安装 Google Chrome，或设置环境变量 PUPPETEER_EXECUTABLE_PATH'
    );
  }

  const html = await renderXlsxToHtmlDocument(buffer);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
          )
      )
    );
    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Excel → PDF（优先 LibreOffice 保真转换，否则用与预览一致的 HTML 渲染）
 */
async function exportXlsxToPdf(buffer) {
  const librePdf = await convertWithLibreOffice(buffer);
  if (librePdf?.length) {
    return librePdf;
  }

  return convertWithPuppeteer(buffer);
}

module.exports = { exportXlsxToPdf };
