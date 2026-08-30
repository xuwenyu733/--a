/** 从创作表单构建页眉字段（与参考模版双列 8 项一致） */
export function buildHeaderMetaFromForm(form) {
  if (!form?.name?.trim()) return null
  const educations = Array.isArray(form.educations) ? form.educations : []
  const edu = educations
    .filter((e) => e.school?.trim() || e.major?.trim())
    .sort((a, b) => (b.end || b.start || '').localeCompare(a.end || a.start || ''))[0] || educations[0] || {}
  const skills = Array.isArray(form.skills) ? form.skills.filter(Boolean) : []
  const gradTime =
    edu.end?.trim() ||
    [edu.start, edu.end].filter(Boolean).join(' – ') ||
    ''

  let advantage = form.targetRole?.trim() || ''
  if (!advantage && skills.length) {
    advantage = skills.slice(0, 2).join('、')
    if (advantage.length > 40) advantage = `${advantage.slice(0, 40)}…`
  }

  return {
    name: form.name.trim(),
    age: form.age?.trim() || '',
    phone: form.phone?.trim() || '',
    email: form.email?.trim() || '',
    city: form.city?.trim() || '',
    targetRole: form.targetRole?.trim() || '',
    major: edu.major?.trim() || '',
    degree: edu.degree?.trim() || '',
    school: edu.school?.trim() || '',
    gradTime,
    advantage,
    photoUrl: form.photoUrl?.trim() || '',
  }
}

export function headerMetaToGridMap(meta) {
  if (!meta) return {}
  return {
    年龄: meta.age,
    电话: meta.phone,
    专业: meta.major,
    邮箱: meta.email,
    学历: meta.degree,
    毕业院校: meta.school,
    优势: meta.advantage,
    毕业时间: meta.gradTime,
    城市: meta.city,
    求职意向: meta.targetRole,
  }
}

/** 从 Markdown 文首解析联系方式（无表单时的导出兜底） */
export function parseHeaderMetaFromMarkdown(markdown) {
  const md = markdown || ''
  const nameMatch = md.match(/^#\s+(.+)$/m)
  if (!nameMatch) return null

  const sectionIdx = md.search(/\n##\s/)
  const headText = sectionIdx >= 0 ? md.slice(0, sectionIdx) : md

  const map = {}
  const re = /^[-*]\s*([^：:]+)[：:]\s*(.+)$/gm
  let m
  while ((m = re.exec(headText))) {
    const key = m[1].trim()
    let val = m[2].trim()
    if (key === '优势' && val.length > 48) {
      val = `${val.slice(0, 48)}…`
    }
    map[key] = val
  }

  const photoMatch = headText.match(/!\[[^\]]*\]\(([^)]+)\)/)
  return {
    name: nameMatch[1].trim(),
    age: map['年龄'] || '',
    phone: map['电话'] || map['手机'] || '',
    email: map['邮箱'] || '',
    city: map['城市'] || '',
    targetRole: map['求职意向'] || '',
    major: map['专业'] || '',
    degree: map['学历'] || '',
    school: map['毕业院校'] || map['学校'] || '',
    gradTime: map['毕业时间'] || map['毕业'] || '',
    advantage: map['优势'] || map['求职意向'] || '',
    photoUrl: photoMatch?.[1]?.trim() || '',
  }
}

function extractBodyAfterHeader(markdown) {
  const md = markdown || ''
  const sectionIdx = md.search(/\n##\s/)
  if (sectionIdx >= 0) return md.slice(sectionIdx).trim()

  let rest = md.replace(/^#\s+[^\n]+\n*/, '')
  rest = rest.replace(/^\s*!\[[^\]]*\]\([^)]+\)\s*\n*/m, '')
  const lines = rest.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i += 1
      continue
    }
    if (/^[-*]\s*[\u4e00-\u9a5A-Za-z0-9]+[：:]/.test(line)) {
      i += 1
      continue
    }
    break
  }
  return lines.slice(i).join('\n').trim()
}

/** 用表单/解析数据覆盖 Markdown 文首页眉 */
export function normalizeResumeHeader(markdown, meta) {
  if (!meta?.name) return markdown || ''

  const lines = []
  if (meta.age) lines.push(`- 年龄：${meta.age}`)
  if (meta.phone) lines.push(`- 电话：${meta.phone}`)
  if (meta.major) lines.push(`- 专业：${meta.major}`)
  if (meta.email) lines.push(`- 邮箱：${meta.email}`)
  if (meta.degree) lines.push(`- 学历：${meta.degree}`)
  if (meta.school) lines.push(`- 毕业院校：${meta.school}`)
  if (meta.advantage) lines.push(`- 优势：${meta.advantage}`)
  if (meta.gradTime) lines.push(`- 毕业时间：${meta.gradTime}`)
  if (meta.city) lines.push(`- 城市：${meta.city}`)
  if (meta.targetRole) lines.push(`- 求职意向：${meta.targetRole}`)

  let header = `# ${meta.name}\n\n${lines.join('\n')}`

  const photo = meta.photoUrl
  if (photo) {
    const p = photo.startsWith('/') ? photo : `/${photo}`
    if (!markdown.includes(photo) && !markdown.includes(p.replace(/^\//, ''))) {
      header += `\n\n![证件照](${p})`
    }
  }

  const body = extractBodyAfterHeader(markdown)
  if (!body) return header

  return `${header}\n\n${body}`.trim()
}

export function resolveHeaderMeta(markdown, builderData, photoUrl) {
  const fromForm = builderData?.name?.trim()
    ? buildHeaderMetaFromForm({ ...builderData, photoUrl: photoUrl || builderData.photoUrl })
    : null
  if (fromForm) return fromForm
  const parsed = parseHeaderMetaFromMarkdown(markdown)
  if (parsed) {
    if (photoUrl) parsed.photoUrl = photoUrl
    return parsed
  }
  return null
}
