const fs = require('fs/promises');

const CHROME_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

async function resolveChromeExecutable() {
  for (const p of CHROME_PATHS) {
    try {
      await fs.access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function launchBrowser() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch {
    throw new Error('需要 puppeteer-core，请在 backend 目录执行 npm install');
  }

  const executablePath = await resolveChromeExecutable();
  if (!executablePath) {
    throw new Error(
      '未找到 Chrome/Chromium，请安装 Google Chrome 或设置 PUPPETEER_EXECUTABLE_PATH'
    );
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
}

module.exports = { launchBrowser, resolveChromeExecutable };
