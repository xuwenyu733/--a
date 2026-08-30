const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const resumeRoutes = require('./routes/resumeRoutes');

const { clientMessage } = require('./utils/safeError');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY?.trim()) {
  console.warn(
    '[警告] 未配置 OPENAI_API_KEY，请在 backend/.env 中设置（参考 backend/.env.example）'
  );
}

const corsOrigin = process.env.CORS_ORIGIN?.trim();
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(',').map((o) => o.trim()),
        }
      : undefined
  )
);
app.use(express.json({ limit: '2mb' }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: '请求过于频繁，请稍后再试' },
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'AI 简历优化服务运行中' });
});

app.use('/api/resume', resumeRoutes);

app.use((err, _req, res, _next) => {
  logger.error(err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: '文件大小不能超过 10MB' });
  }
  res.status(500).json({ success: false, message: clientMessage(err, '服务器错误') });
});

app.listen(PORT, () => {
  logger.info(`服务已启动: http://localhost:${PORT}`);
});
