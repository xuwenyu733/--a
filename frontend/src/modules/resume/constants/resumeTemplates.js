/** 简历创作 — 可选版式模板（结构一致，仅章节条主题色不同） */
export const RESUME_TEMPLATES = [
  {
    id: 'classic-green',
    name: '经典绿条',
    description: '绿条模版：8 字段页眉 + 项目/在校/技能分区（与用户参考图一致）',
    accent: '#2d8f4e',
    sample: '绿条',
    suitableFor: '技术岗 · 校招 · 项目经历较多',
    features: [
      '页眉：姓名 + 8 项双列信息 + 右上证件照',
      '章节顺序：项目经历 → 在校经历 → 掌握技能',
      '项目：灰条三列（名 | 角色 | 时间）+【项目简介】等标签',
      '在校/技能：黑框内容区 + 分类标签',
      '单页 A4，内容完整展示（自动缩放适配）',
    ],
  },
  {
    id: 'modern-blue',
    name: '专业蓝条',
    description: '与经典绿条相同版式，章节条为专业蓝色',
    accent: '#2563eb',
    sample: '蓝条',
    suitableFor: '互联网 · 研发 / 产品 · 偏理性专业',
    features: [
      '与经典版式一致：姓名左、照片右、双列联系方式',
      '蓝色全宽章节条，结构清晰易读',
      '项目经历灰条标题块，便于 HR 扫读',
      '适合希望偏蓝色视觉的候选人',
      'PDF 导出为蓝色章节条样式',
    ],
  },
  {
    id: 'sidebar-navy',
    name: '沉稳深蓝',
    description: '与经典绿条相同版式，章节条为沉稳深蓝色',
    accent: '#1e3a5f',
    sample: '深蓝',
    suitableFor: '国企 · 事业单位 · 综合 / 技术岗',
    features: [
      '与经典版式一致：单栏信息流，无侧栏挤压',
      '深蓝色章节条，风格稳重正式',
      '项目、教育、技能分区与参考简历相同',
      '适合偏正式场合的求职场景',
      'PDF 导出为深蓝章节条样式',
    ],
  },
]

export const DEFAULT_RESUME_TEMPLATE = 'classic-green'

export function getTemplateById(id) {
  return RESUME_TEMPLATES.find((t) => t.id === id) || RESUME_TEMPLATES[0]
}
