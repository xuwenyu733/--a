/**
 * 将表单数据转为草稿 + AI 生成完整简历的 Prompt
 * 版式对齐用户提供的参考模版（色条章节 + 灰条三列项目 + 分类技能）
 */
function joinLines(items, formatter) {
  if (!items?.length) return '（未填写）'
  return items.map(formatter).join('\n\n')
}

export function buildDraftFromForm(data) {
  const {
    name,
    age,
    phone,
    email,
    city,
    targetRole,
    summary,
    skills = [],
    educations = [],
    projects = [],
    experiences = [],
    honors,
    photoUrl,
  } = data

  const latestEdu = educations
    .filter((e) => e.school?.trim() || e.major?.trim())
    .sort((a, b) => (b.end || b.start || '').localeCompare(a.end || a.start || ''))[0] || educations[0] || {}
  const advantage = skills.length
    ? skills.join('、')
    : targetRole || '—'
  const gradTime = latestEdu.end || (latestEdu.start ? `${latestEdu.start}–${latestEdu.end || ''}` : '—')

  let draft = `# ${name || '姓名待填'}

- 年龄：${age || '—'}
- 电话：${phone || '—'}
- 专业：${latestEdu.major || '—'}
- 邮箱：${email || '—'}
- 学历：${latestEdu.degree || '—'}
- 毕业院校：${latestEdu.school || '—'}
- 优势：${advantage}
- 毕业时间：${gradTime}
- 城市：${city || '—'}
- 求职意向：${targetRole || '—'}
${photoUrl ? `- 证件照：${photoUrl}` : ''}

## 个人简介
${summary?.trim() || '（待补充，请根据用户其他信息写 2–4 句）'}

## 技能栈
${skills.length ? skills.map((s) => `- ${s}`).join('\n') : '（待补充，请按前端/后端/数据库/工程化分类）'}

## 教育经历
${joinLines(educations, (e) => `- ${e.school || ''} | ${e.major || ''} | ${e.degree || ''} | ${e.start || ''}–${e.end || ''}`)}

## 项目经历
${joinLines(projects, (p) => {
    const period = [p.start, p.end].filter(Boolean).join(' – ') || '—'
    const role =
      p.targetRole ||
      (p.techStack?.length ? `个人项目` : '个人项目')
    const tech = (p.techStack || []).join('、') || '—'
    const bullets = []
    if (p.description?.trim()) bullets.push(`- ${p.description.trim()}`)
    if (tech && tech !== '—') bullets.push(`- 技术栈：${tech}`)
    return `### ${p.name || '项目'} | ${role} | ${period}
${bullets.length ? bullets.join('\n') : '- （请根据描述扩写 4–6 条成果要点）'}`
  })}
`

  if (experiences?.length) {
    draft += `\n## 在校经历 / 实习经历
${joinLines(experiences, (w) => `- ${w.company || ''} · ${w.role || ''}（${w.start || ''}–${w.end || ''}）\n  ${w.description || ''}`)}
`
  }

  const honorsText = honors?.trim()
  draft += `
## 荣誉与证书
${honorsText || '（若用户未提供可写「暂无」或省略本节）'}

## 自我评价
（可基于个人简介与优势写 1–2 句，勿编造证书）`

  return draft.trim()
}

const STANDARD_LAYOUT_HINT = `【版式：与用户参考模版一致】

一、页眉（严禁合并为一行）
- # 仅写姓名（大号、主题色）
- 联系方式必须各占一行，格式固定为 \`- 标签：值\`，顺序如下（有值才写）：
  年龄、电话、专业、邮箱、学历、毕业院校、优势、毕业时间、城市、求职意向
- **禁止**用竖线 | 把电话/邮箱/学校写在同一行
- 证件照 Markdown 保留在文首

二、章节顺序（固定，不得调换）
1. ## 个人简介（2–4 句段落）
2. ## 技能栈（分类 bullet，如 \`- **前端**：Vue3、Pinia…\`、\`- **后端**：…\`、\`- **数据库**：…\`、\`- **工程化**：…\`）
3. ## 教育经历（每条一行：学校 | 专业 | 学历 | 年份）
4. ## 项目经历（每个项目必须完整输出）
5. ## 在校经历 / 实习经历（若有草稿内容）
6. ## 荣誉与证书（无信息可写「暂无」）
7. ## 自我评价（1–2 句）

三、每个项目（## 项目经历 下）
- 标题：\`### 项目名称 | 项目类型/角色 | 起止时间\`（对应灰条三列）
- 正文优先使用带标签的结构（便于 Excel 导出）：
  - \`【项目简介】\` 一段概述
  - \`【技术栈】\` 技术列表
  - \`【实现功能】\` 下 3–5 条 \`-\` bullet
  - \`【项目难点】\` 下 1–3 条 \`-\` bullet
- 用户草稿中的每个项目都要写，禁止合并或省略

四、技能章节
- 章节标题可用 \`## 掌握技能\` 或 \`## 技能栈\`
- 按方向分子块，每块以单独一行 \`【前端技术栈】\`、\`【后端技术栈】\`、\`【工程化与工具链】\` 等开头，下列 \`-\` bullet

五、篇幅（在生成时控制，不要依赖后期删减）
- 目标打印 1 页 A4：每条 bullet 控制在一行内，措辞精炼
- **禁止**删除章节、省略某个项目、删掉技能分类
- 只能压缩空话与重复句，不能把用户已填内容整段删掉`

export const RESUME_GENERATE_SYSTEM_PROMPT = `你是专业的简历撰写助手。必须返回合法 JSON：optimizedContent（完整 Markdown 简历）、suggestions（2–4 条说明）。

核心原则：
1. optimizedContent 必须包含用户草稿中的全部项目、教育、技能、经历要点
2. 通过精炼措辞与合理扩写控制篇幅，目标 1 页 A4，但不得删减板块或省略某个项目
3. 禁止编造用户未提供的公司、奖项、证书
4. 章节顺序与版式说明必须严格遵守
5. 若「荣誉与证书」章节已列出论文/奖项/证书，则「个人简介」中不要重复提及这些具体成果，改为概括性描述（如"科研经历丰富"）》`

const templateHints = {
  'classic-green': `${STANDARD_LAYOUT_HINT}\n- 主题色：绿色章节条 + 灰色三列项目条`,
  'modern-blue': `${STANDARD_LAYOUT_HINT}\n- 主题色：蓝色章节条（#2f5496，版式同绿条）`,
  'sidebar-navy': `${STANDARD_LAYOUT_HINT}\n- 主题色：深蓝章节条（单栏）`,
}

export function buildGeneratePrompt({
  draft,
  jobDescription,
  style = 'professional',
  template = 'classic-green',
  photoUrl,
}) {
  const styleMap = {
    professional: '专业、简洁，突出成果与量化指标',
    creative: '有创意但仍保持职场专业度',
    concise: '精简措辞，但保留全部章节与项目',
  }
  const styleHint = styleMap[style] || styleMap.professional
  const templateHint = templateHints[template] || templateHints['classic-green']

  let prompt = `请根据下列【用户原始信息】生成一份可直接使用的 Markdown 简历。文风：${styleHint}。

${templateHint}

再次强调：用户草稿里有几个项目，输出里就要有几个 ### 项目标题；技能、教育、简介都要保留。`

  if (photoUrl) {
    prompt += `\n证件照路径须保留：![证件照](${photoUrl})`
  }

  if (jobDescription?.trim()) {
    prompt += `

【目标岗位 JD】
${jobDescription.trim()}`
  }

  prompt += `

---

【用户原始信息】
${draft}

---

JSON 格式：
{
  "optimizedContent": "完整 Markdown",
  "suggestions": ["说明1", "说明2"]
}`

  return prompt
}
