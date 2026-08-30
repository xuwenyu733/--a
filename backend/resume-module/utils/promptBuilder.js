function buildOptimizePrompt({ content, jobDescription, style = 'professional' }) {
  const styleMap = {
    professional: '专业、简洁，突出成果与量化指标',
    creative: '有创意但仍保持职场专业度',
    concise: '极度精简，每段只保留核心亮点',
  };

  const styleHint = styleMap[style] || styleMap.professional;

  let prompt = `你是一位资深 HR 与简历顾问。请优化以下简历内容，风格要求：${styleHint}。

要求：
1. 保留真实信息，不要编造未提及的经历、公司或技能
2. 用 STAR 法则改写项目与工作经历（情境、任务、行动、结果）
3. 将模糊描述改为可量化的表述（如提升 X%、负责 N 人团队）
4. 优化措辞，减少口语化，增强动词力度
5. 输出 Markdown，版式为：页眉 8 字段 → 项目经历（### 名|角色|时间 +【标签】）→ 在校经历 → 掌握技能
6. 【A4 单页填满】优化结果必须恰好填满 1 张 A4 纸（标准字号约 9.5pt、页边距约 12mm）：
   - 内容过多（会超页）：精简冗余描述、合并相近条目、缩短 bullet 长度，优先保留与目标岗位最相关的经历
   - 内容过少（页面上半部分就结束）：在真实信息范围内合理补充——细化项目成果与量化数据、充实技能描述、适当展开职责亮点，不要编造
   - 目标：打印后一页 A4 版面利用率约 85%–97%，不多不少

请同时给出 3-5 条简短的优化说明（每条一句话），说明主要改进了什么。

---

【原始简历】
${content}`;

  if (jobDescription?.trim()) {
    prompt += `

---

【目标岗位 JD】
${jobDescription.trim()}

请根据 JD 关键词适当调整简历侧重点，使匹配度更高。`;
  }

  prompt += `

---

请严格按以下 JSON 格式回复，不要包含其它文字：
{
  "optimizedContent": "优化后的完整简历 Markdown",
  "suggestions": ["建议1", "建议2", "建议3"]
}`;

  return prompt;
}

function buildA4AdjustPrompt({ content, action, metrics }) {
  const fillPercent = Math.round((metrics.fillRatio || 0) * 100);

  const actionGuide =
    action === 'trim'
      ? `当前简历在 A4 排版下超出 1 页（共 ${metrics.pages} 页）。请**压缩措辞**使内容可排入 1 页 A4：缩短 bullet 长度、合并重复表述，**不得删除整段章节或省略用户已有的项目/技能要点**。`
      : `当前简历在 A4 排版下不足 1 页（版面利用率约 ${fillPercent}%）。请在真实信息范围内合理补充：细化项目成果与量化数据、充实技能描述，不要编造经历。`;

  return `${actionGuide}

要求：
1. 保留真实信息，不要编造未提及的经历、公司或技能
2. 输出格式仍为 Markdown
3. 最终排版目标：恰好 1 页 A4，版面利用率 85%–97%
4. 若文首有证件照 Markdown 图片行 \`![证件照](...)\`，必须原样保留，不得删除或改写路径

---

【当前简历】
${content}

---

请严格按以下 JSON 格式回复，不要包含其它文字：
{
  "optimizedContent": "调整后的完整简历 Markdown",
  "suggestions": ["调整说明1", "调整说明2"]
}`;
}

module.exports = { buildOptimizePrompt, buildA4AdjustPrompt };
