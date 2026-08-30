import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function renderPdfToCanvases(arrayBuffer, containerWidth) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const dpr = Math.min(window.devicePixelRatio || 2, 3);
  const width = Math.max(containerWidth, 280);
  const canvases = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = width / baseViewport.width;
    const renderScale = scale * dpr;
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    await page.render({ canvasContext: context, viewport }).promise;
    canvases.push(canvas);
  }

  return canvases;
}
