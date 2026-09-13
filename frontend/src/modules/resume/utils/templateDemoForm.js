/** 模版详情预览用的示例简历数据 */
export function createTemplateDemoForm() {
  return {
    name: '徐文宇',
    age: '22',
    phone: '13800000003',
    email: 'name@school.edu.cn',
    city: '北京',
    targetRole: '前端开发工程师',
    summary:
      '计算机科学与技术专业应届，具备全栈开发与工程化实践能力，熟悉 Vue 生态与 Node 服务开发，有个人项目与校园平台实战经验。',
    photoUrl: '',
    skills: ['Vue 3', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Git'],
    educations: [
      {
        school: 'XX 大学',
        major: '计算机科学与技术',
        degree: '本科',
        start: '2021-09',
        end: '2025-06',
      },
    ],
    projects: [
      {
        name: '校园市集交易平台',
        targetRole: '个人开发（前后端）',
        description:
          '面向在校学生的二手交易与生活服务平台，支持商品发布、即时聊天、校园跑腿与 AI 简历等模块。',
        techStack: ['Vue 3', 'Pinia', 'Express', 'MongoDB', 'WebSocket'],
        start: '2024-03',
        end: '2024-06',
      },
      {
        name: '智能简历助手',
        targetRole: '个人开发（Vue + Node）',
        description: '基于大模型的简历创作模块，支持多模版导出 PDF。',
        techStack: ['Vue 3', 'DeepSeek API', 'PDFKit'],
        start: '2024-09',
        end: '2025-01',
      },
    ],
    experiences: [
      {
        company: '某互联网公司',
        role: '前端实习生',
        description: '参与管理后台组件库建设，完成 3 个业务模块开发与联调。',
        start: '2024-07',
        end: '2024-09',
      },
    ],
  }
}
