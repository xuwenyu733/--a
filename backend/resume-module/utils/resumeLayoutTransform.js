function esc(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').trim();
}

function parseUlToPairs(ulHtml) {
  const map = {};
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(ulHtml))) {
    const text = stripTags(m[1]);
    const kv = text.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (kv) map[kv[1].trim()] = kv[2].trim();
  }
  return map;
}

function parsePipeContactLine(line) {
  const map = {};
  const parts = String(line)
    .split('|')
    .map((s) => stripTags(s).trim())
    .filter(Boolean);
  for (const p of parts) {
    const digits = p.replace(/\D/g, '');
    if (digits.length === 11 && /^1/.test(digits)) map['电话'] = digits;
    else if (/@/.test(p)) map['邮箱'] = p.replace(/^mailto:/i, '');
    else if (/学院|大学|学校|专科|本科/.test(p)) map['毕业院校'] = p;
    else if (/工程师|开发|产品|运营|设计|实习/.test(p)) map['求职意向'] = p;
    else if (/^[\u4e00-\u9fa5]{2,8}$/.test(p) && !map['城市']) map['城市'] = p;
    else if (!map['优势']) map['优势'] = p;
  }
  return map;
}

function parseContactFromHeadBlock(headBlock) {
  const ulMatch = headBlock.match(/<ul[\s\S]*?<\/ul>/i);
  if (ulMatch) return parseUlToPairs(ulMatch[0]);

  const map = {};
  const re = /<p>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(headBlock))) {
    const text = stripTags(m[1]);
    if (!text) continue;
    if (text.includes('|')) Object.assign(map, parsePipeContactLine(text));
    else {
      const kv = text.match(/^([^：:]+)[：:]\s*(.+)$/);
      if (kv) map[kv[1].trim()] = kv[2].trim();
    }
  }
  return map;
}

function cellHtml(k, v) {
  return `<li><span class="resume-meta-label">${esc(k)}：</span><span class="resume-meta-value">${esc(v)}</span></li>`
}

function buildMetaGridFromPairs(map) {
  const order = ['年龄', '电话', '专业', '邮箱', '学历', '毕业院校', '优势', '毕业时间', '城市', '求职意向']
  const items = order
    .map((key) => {
      const v = map[key]
      if (!v || String(v).trim() === '' || v === '—') return ''
      return cellHtml(key, v)
    })
    .filter(Boolean)

  if (!items.length) return ''
  return `<ul class="resume-meta-list">${items.join('')}</ul>`
}

function wrapTaggedParagraphs(body) {
  return body.replace(
    /<p>(\s*<strong>【[^】]+】<\/strong>[\s\S]*?)<\/p>/gi,
    '<p class="resume-tag-line">$1</p>'
  );
}

function transformProjectHeadings(html) {
  if (html.includes('class="resume-project"')) return html;
  return html.replace(
    /<h3>([^<]+)<\/h3>\s*([\s\S]*?)(?=<h3>|<h2>|$)/gi,
    (_, title, body) => {
      const parts = stripTags(title)
        .split('|')
        .map((s) => s.trim());
      const name = parts[0] || stripTags(title);
      const role = parts[1] || '个人项目';
      const date = parts[2] || '';
      const inner = wrapTaggedParagraphs(body.trim());
      return `<article class="resume-project"><div class="resume-project__bar">
        <span class="resume-project__name">${esc(name)}</span>
        <span class="resume-project__role">${esc(role)}</span>
        <span class="resume-project__date">${esc(date)}</span>
      </div>${inner ? `<div class="resume-project__body">${inner}</div>` : ''}</article>`;
    }
  );
}

function wrapH2Sections(html) {
  if (html.includes('class="resume-section"')) return html;
  return html.replace(
    /<h2[^>]*>([\s\S]*?)<\/h2>\s*([\s\S]*?)(?=<h2[^>]*>|$)/gi,
    (_, title, body) => {
      const t = stripTags(title);
      const isProjects = /项目/.test(t);
      const isCampus = /在校|校园|实习/.test(t) && !/工作/.test(t);
      const isSkills = /技能/.test(t);
      let bodyClass = 'resume-section__body';
      if (isProjects) bodyClass += ' resume-section__body--projects';
      else if (isCampus) bodyClass += ' resume-section__body--campus';
      else if (isSkills) bodyClass += ' resume-section__body--skills';

      const inner = wrapTaggedParagraphs(body.trim());
      const blockWrap =
        isCampus || isSkills
          ? `<div class="resume-content-block">${inner}</div>`
          : inner;

      return `<section class="resume-section"><h2 class="resume-section__title">${title}</h2><div class="resume-section__rule"></div><div class="${bodyClass}">${blockWrap}</div></section>`;
    }
  );
}

function transformResumeHtml(html) {
  if (!html?.trim()) return html || '';
  let out = transformProjectHeadings(html);
  out = wrapH2Sections(out);
  return out;
}

module.exports = {
  esc,
  transformResumeHtml,
  buildMetaGridFromPairs,
  parseUlToPairs,
  parseContactFromHeadBlock,
};
