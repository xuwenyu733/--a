/** 浏览器端 Excel 预览（ESM，避免 .cjs 中 require 在 Vite 报错） */

import xlsxRenderer from './xlsxRendererCore.js'

export async function renderXlsxPreviewHtml(buffer) {
  return xlsxRenderer.renderXlsxPreviewHtml(buffer)
}

export async function renderXlsxToHtmlDocument(buffer) {
  return xlsxRenderer.renderXlsxToHtmlDocument(buffer)
}

export async function buildSheetHtml(buffer) {
  return xlsxRenderer.buildSheetHtml(buffer)
}
