const fs = require('fs');
const path = require('path');
const { FONT_CN, FONT_EN } = require('./resumeTypography');

function isSupportedFont(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.ttf' || ext === '.otf' || ext === '.ttc';
}

function firstExisting(paths) {
  for (const p of paths) {
    if (p && fs.existsSync(p) && isSupportedFont(p)) return p;
  }
  return null;
}

/**
 * 解析 PDF 用中英文字体路径
 * Windows: 微软雅黑 + Calibri；macOS/Linux 使用常见替代
 */
function resolveResumeFonts() {
  const cn = firstExisting([
    'C:\\Windows\\Fonts\\msyh.ttc',
    'C:\\Windows\\Fonts\\msyhbd.ttc',
    '/System/Library/Fonts/Supplemental/Microsoft YaHei.ttf',
    '/System/Library/Fonts/PingFang.ttc',
    path.join(__dirname, '../../assets/fonts/NotoSansSC-Regular.ttf'),
    '/Library/Fonts/Arial Unicode.ttf',
  ]);

  const en = firstExisting([
    'C:\\Windows\\Fonts\\calibri.ttf',
    'C:\\Windows\\Fonts\\calibrib.ttf',
    '/Library/Fonts/Microsoft/Calibri.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
  ]);

  if (!cn) {
    throw new Error('未找到中文字体（微软雅黑或替代字体），无法生成 PDF');
  }

  return {
    cn: { path: cn, name: FONT_CN },
    en: { path: en || cn, name: en ? FONT_EN : FONT_CN },
  };
}

module.exports = { resolveResumeFonts, isSupportedFont };
