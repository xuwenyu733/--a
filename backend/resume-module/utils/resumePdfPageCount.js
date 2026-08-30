async function countPdfPages(buffer) {
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const info = await parser.getInfo();
    return info.total > 0 ? info.total : 1;
  } catch {
    return 1;
  }
}

module.exports = { countPdfPages };
