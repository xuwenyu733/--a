import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

export function renderSafeMarkdown(text) {
  if (!text?.trim()) return '';
  const raw = md.render(text);
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  });
}
