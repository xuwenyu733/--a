const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function normalizePhotoPath(photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return '';
  let p = photoUrl.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) {
    try {
      const u = new URL(p);
      // 仅允许指向本服务 uploads 的路径，禁止任意外网/内网 SSRF
      return u.pathname;
    } catch {
      return '';
    }
  }
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

function localPathFromDbPath(dbPath) {
  const normalized = normalizePhotoPath(dbPath);
  if (!normalized.startsWith('/uploads/')) return null;
  // 禁止路径穿越
  const rel = normalized.slice('/uploads/'.length);
  if (!rel || rel.includes('..') || path.isAbsolute(rel)) return null;
  const abs = path.resolve(UPLOADS_DIR, rel);
  if (!abs.startsWith(path.resolve(UPLOADS_DIR) + path.sep) && abs !== path.resolve(UPLOADS_DIR)) {
    return null;
  }
  return abs;
}

/**
 * 将存库路径解析为图片 Buffer。禁止 fetch 任意 URL（防 SSRF）。
 */
async function loadResumePhotoBuffer(photoUrl) {
  if (!photoUrl?.trim()) return null;

  const localPath = localPathFromDbPath(photoUrl);
  if (localPath && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  return null;
}

/** 从 Markdown 正文中提取首个图片地址 */
function extractFirstImageSrc(content) {
  if (!content) return '';
  const m = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return m ? m[1].trim() : '';
}

module.exports = {
  loadResumePhotoBuffer,
  extractFirstImageSrc,
  normalizePhotoPath,
  localPathFromDbPath,
};
