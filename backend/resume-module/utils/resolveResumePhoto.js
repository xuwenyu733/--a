const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function normalizePhotoPath(photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return '';
  let p = photoUrl.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) {
    try {
      return new URL(p).pathname;
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
  const filename = path.basename(normalized);
  if (!filename || filename.includes('..')) return null;
  return path.join(UPLOADS_DIR, filename);
}

function fetchUrlBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

/**
 * 将存库路径或完整 URL 解析为图片 Buffer，供 PDFKit 使用
 */
async function loadResumePhotoBuffer(photoUrl) {
  if (!photoUrl?.trim()) return null;

  const localPath = localPathFromDbPath(photoUrl);
  if (localPath && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  const raw = photoUrl.trim();
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      if (typeof fetch === 'function') {
        const res = await fetch(raw);
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      } else {
        return await fetchUrlBuffer(raw);
      }
    } catch {
      /* fall through */
    }
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
  normalizePhotoPath,
  localPathFromDbPath,
  loadResumePhotoBuffer,
  extractFirstImageSrc,
};
