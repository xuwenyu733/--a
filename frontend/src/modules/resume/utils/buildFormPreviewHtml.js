import { DEFAULT_RESUME_TEMPLATE } from '../constants/resumeTemplates'
import { buildMetaGridFromPairs } from './resumeLayoutTransform'

function esc(s) {
  if (s == null || s === '') return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function hasText(s) {
  return Boolean(s?.trim?.())
}

function joinPeriod(start, end) {
  const a = start?.trim() || ''
  const b = end?.trim() || ''
  if (a && b) return `${a} – ${b}`
  return a || b || ''
}

function tagLine(label, text) {
  if (!hasText(text)) return ''
  return `<p class="resume-tag-line"><strong>【${esc(label)}】</strong>${esc(text)}</p>`
}

function renderProjects(projects) {
  const list = (projects || []).filter((p) => hasText(p.name) || hasText(p.description))
  if (!list.length) return ''
  return list
    .map((p) => {
      const tech = Array.isArray(p.techStack) ? p.techStack.filter(Boolean).join('、') : ''
      const period = joinPeriod(p.start, p.end)
      const role = p.targetRole?.trim() || '个人项目'
      const bullets = []
      if (hasText(p.description)) bullets.push(`<li>${esc(p.description)}</li>`)
      if (tech) bullets.push(`<li>技术栈：${esc(tech)}</li>`)
      return `
      <article class="resume-project">
        <div class="resume-project__bar">
          <span class="resume-project__name">${esc(p.name || '项目名称')}</span>
          <span class="resume-project__role">${esc(role)}</span>
          <span class="resume-project__date">${esc(period)}</span>
        </div>
        <div class="resume-project__body">
          <ul class="resume-list">${bullets.join('') || '<li>（待填写项目描述）</li>'}</ul>
        </div>
      </article>`
    })
    .join('')
}

function renderSkills(skills) {
  const list = Array.isArray(skills) ? skills.filter(Boolean) : []
  if (!list.length) return '<p class="resume-muted">（待填写技能）</p>'
  return `<ul class="resume-list resume-list--inline">${list.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
}

function renderEducations(educations) {
  const list = (educations || []).filter((e) => hasText(e.school))
  if (!list.length) return ''
  return `<ul class="resume-list">${list
    .map(
      (e) =>
        `<li>${esc(e.school)} | ${esc(e.major || '')} | ${esc(e.degree || '')} | ${esc(joinPeriod(e.start, e.end))}</li>`
    )
    .join('')}</ul>`
}

function renderExperiences(experiences) {
  const list = (experiences || []).filter((e) => hasText(e.company) || hasText(e.description))
  if (!list.length) return ''
  return `<div class="resume-content-block">${list
    .map(
      (e) => `
      ${tagLine('项目简介', e.company ? `${e.company}：${e.description || ''}` : e.description)}
      ${tagLine('我的职责', e.role)}
    `
    )
    .join('')}</div>`
}

function buildMetaGrid(form) {
  const edu = form.educations?.[0] || {}
  const advantage = form.skills?.length
    ? form.skills.filter(Boolean).join('、')
    : form.targetRole || ''
  const gradTime = edu.end?.trim() || joinPeriod(edu.start, edu.end)

  const html = buildMetaGridFromPairs({
    年龄: form.age,
    电话: form.phone,
    专业: edu.major,
    邮箱: form.email,
    学历: edu.degree,
    毕业院校: edu.school,
    优势: advantage,
    毕业时间: gradTime,
    城市: form.city,
    求职意向: form.targetRole,
  })

  return html || '<p class="resume-muted">请填写基本信息与教育经历</p>'
}

function photoHtml(photoUrl, resolveUrl) {
  if (!photoUrl) return ''
  const src = resolveUrl ? resolveUrl(photoUrl) : photoUrl
  return `<div class="resume-photo"><img src="${esc(src)}" alt="证件照" /></div>`
}

function section(title, inner) {
  if (!inner?.trim()) return ''
  return `
  <section class="resume-section">
    <h2 class="resume-section__title">${esc(title)}</h2>
    <div class="resume-section__rule"></div>
    <div class="resume-section__body">${inner}</div>
  </section>`
}

/** 与参考模版一致：简介 → 技能 → 教育 → 项目 → 在校 */
function buildStandardResume(form, resolveUrl) {
  const name = form.name?.trim() || '姓名'
  const projects = renderProjects(form.projects)
  const educations = renderEducations(form.educations)
  const experiences = renderExperiences(form.experiences)

  return `
  <article class="resume-doc resume-doc--standard">
    <header class="resume-head resume-head--standard">
      <div class="resume-head__main">
        <h1 class="resume-name">${esc(name)}</h1>
        ${buildMetaGrid(form)}
      </div>
      ${photoHtml(form.photoUrl, resolveUrl)}
    </header>
    ${section('个人简介', hasText(form.summary) ? `<p>${esc(form.summary)}</p>` : '<p class="resume-muted">（待填写）</p>')}
    ${section('技能栈', renderSkills(form.skills))}
    ${educations ? section('教育经历', educations) : ''}
    ${section('项目经历', projects || '<p class="resume-muted">（待添加项目）</p>')}
    ${experiences ? section('在校经历', experiences) : ''}
  </article>`
}

export function buildFormPreviewHtml(form, templateId = DEFAULT_RESUME_TEMPLATE, resolveUrl) {
  void templateId
  return buildStandardResume(form || {}, resolveUrl)
}
