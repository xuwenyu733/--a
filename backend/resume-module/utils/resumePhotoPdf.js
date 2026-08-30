const { PHOTO_2INCH } = require('./resumeTypography');

function photoSizeForTemplate(_templateId) {
  return { w: PHOTO_2INCH.ptW, h: PHOTO_2INCH.ptH };
}

/**
 * 在指定 Y 坐标绘制证件照（右上，不推进 doc.y）
 * @returns {number} 正文需预留的右侧宽度
 */
function renderHeaderPhotoAt(doc, photoBuffer, templateId, contentWidth, y) {
  if (!photoBuffer?.length) return 0;

  const { w, h } = photoSizeForTemplate(templateId);
  const gap = 12;
  const x = doc.page.margins.left + contentWidth - w;

  try {
    doc.image(photoBuffer, x, y, { fit: [w, h], align: 'center', valign: 'center' });
    doc.save();
    doc.lineWidth(0.5).strokeColor('#cbd5e1').rect(x, y, w, h).stroke();
    doc.restore();
    return w + gap;
  } catch {
    return 0;
  }
}

/**
 * @deprecated 使用 renderHeaderPhotoAt + renderHeaderBlock
 */
function renderHeaderPhoto(doc, photoBuffer, templateId, contentWidth) {
  const reserved = renderHeaderPhotoAt(doc, photoBuffer, templateId, contentWidth, doc.y);
  if (!reserved) return 0;
  const { h } = photoSizeForTemplate(templateId);
  const blockBottom = doc.y + h;
  if (doc.y < blockBottom) doc.y = blockBottom;
  return reserved;
}

module.exports = {
  photoSizeForTemplate,
  renderHeaderPhoto,
  renderHeaderPhotoAt,
  PHOTO_2INCH,
};
