const { createWorker } = require('tesseract.js');
const logger = require('../utils/logger');

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      logger.info('正在初始化 OCR 引擎（首次加载需下载语言包，请稍候）...');
      const worker = await createWorker('chi_sim+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) {
            const pct = Math.round(m.progress * 100);
            if (pct % 20 === 0) logger.info(`OCR 识别进度: ${pct}%`);
          }
        },
      });
      logger.info('OCR 引擎就绪');
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function extractTextFromImage(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return (data.text || '').trim();
}

module.exports = { extractTextFromImage };
