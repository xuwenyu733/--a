const path = require('path');

function stripPhotoFromMarkdown(markdown) {
  if (!markdown?.trim()) return markdown || '';
  return markdown
    .replace(/^!\[证件照\]\([^)]+\)\s*\n*/gim, '')
    .replace(/^[-*]\s*证件照[：:][^\n]*\n?/gim, '')
    .trimStart();
}

function extractImgSrc(fragment) {
  const m = fragment.match(/\ssrc="([^"]+)"/i) || fragment.match(/\ssrc='([^']+)'/i);
  return m ? m[1] : '';
}

function buildPhotoBox(src) {
  if (!src) return '';
  return `<div class="resume-photo"><img src="${src}" alt="证件照" width="88" height="123" /></div>`;
}

function toDataUri(buffer) {
  if (!buffer?.length) return '';
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  const mime = isPng ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function extractLeadingPhotoHtml(html, photoDataUri) {
  let work = html.trim();

  const divMatch = work.match(/^<div class="resume-photo[^>]*>[\s\S]*?<\/div>\s*/i);
  if (divMatch) {
    const src = extractImgSrc(divMatch[0]) || photoDataUri;
    return {
      photoHtml: buildPhotoBox(src),
      rest: work.slice(divMatch[0].length).trimStart(),
    };
  }

  const pImgMatch = work.match(/^<p>\s*<img[\s\S]*?<\/p>\s*/i);
  if (pImgMatch) {
    const src = extractImgSrc(pImgMatch[0]) || photoDataUri;
    return {
      photoHtml: buildPhotoBox(src),
      rest: work.slice(pImgMatch[0].length).trimStart(),
    };
  }

  const loneImg = work.match(/^<img[\s\S]*?>\s*/i);
  if (loneImg) {
    const src = extractImgSrc(loneImg[0]) || photoDataUri;
    return {
      photoHtml: buildPhotoBox(src),
      rest: work.slice(loneImg[0].length).trimStart(),
    };
  }

  if (photoDataUri) {
    return { photoHtml: buildPhotoBox(photoDataUri), rest: work };
  }

  return { photoHtml: '', rest: work };
}

function removeStrayPhotoBlocks(html) {
  return html.replace(/<p>\s*<img[^>]*alt="证件照"[^>]*>\s*<\/p>/gi, '');
}

module.exports = {
  stripPhotoFromMarkdown,
  buildPhotoBox,
  extractLeadingPhotoHtml,
  removeStrayPhotoBlocks,
  toDataUri,
};
