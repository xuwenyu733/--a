const { buildA4AdjustPrompt } = require('../utils/promptBuilder');
const { measureHtmlResumeLayout } = require('./resumeHtmlMeasure');
const { optimizeResume } = require('./aiService');
const logger = require('../utils/logger');

const MAX_A4_ITERATIONS = 4;

async function adjustForA4(content, metrics) {
  const action = metrics.isOverflow ? 'trim' : 'expand';
  const prompt = buildA4AdjustPrompt({ content, action, metrics });
  const result = await optimizeResume(prompt);
  return result.optimizedContent;
}

async function fitContentToA4(content, options = {}) {
  const { templateId, photoUrl } = options;
  let current = content;
  let metrics = await measureHtmlResumeLayout(current, templateId, photoUrl, 1);
  let iterations = 0;

  while (!metrics.fitsA4 && iterations < MAX_A4_ITERATIONS) {
    const action = metrics.isOverflow ? 'trim' : 'expand';
    logger.info(
      `A4 微调 (${iterations + 1}/${MAX_A4_ITERATIONS}): ${action}, pages=${metrics.pages}, compact=${metrics.compactLevel}`
    );
    current = await adjustForA4(current, metrics);
    metrics = await measureHtmlResumeLayout(current, templateId, photoUrl, 1);
    iterations += 1;
  }

  return {
    content: current,
    a4Metrics: {
      fontSize: 11,
      pages: metrics.pages,
      fillRatio: metrics.fillRatio,
      isOverflow: metrics.isOverflow,
      fitsA4: metrics.fitsA4,
    },
    a4Adjusted: iterations > 0,
  };
}

module.exports = { fitContentToA4 };
