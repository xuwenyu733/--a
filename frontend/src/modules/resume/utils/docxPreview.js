import mammoth from 'mammoth';

export async function renderDocxPreviewHtml(arrayBuffer) {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((imageBuffer) => ({
          src: `data:${image.contentType};base64,${imageBuffer}`,
        }))
      ),
    }
  );
  return result.value || '<div class="docx-empty">空文档</div>';
}
