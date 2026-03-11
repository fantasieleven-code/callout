import type { ProjectContext, Perspective } from './types.js';
import { ALL_PERSPECTIVES } from './types.js';
import { ctoBuildPrompt } from './prompts/cto.js';
import { securityBuildPrompt } from './prompts/security.js';
import { productBuildPrompt } from './prompts/product.js';
import { devopsBuildPrompt } from './prompts/devops.js';
import { customerBuildPrompt } from './prompts/customer.js';
import { strategyBuildPrompt } from './prompts/strategy.js';
import { investorBuildPrompt } from './prompts/investor.js';
import { unicornFounderBuildPrompt } from './prompts/unicorn-founder.js';
import { soloEntrepreneurBuildPrompt } from './prompts/solo-entrepreneur.js';

const PROMPT_BUILDERS: Record<Perspective, (ctx: ProjectContext, customerRole?: string) => string> = {
  cto: ctoBuildPrompt,
  security: securityBuildPrompt,
  product: productBuildPrompt,
  devops: devopsBuildPrompt,
  customer: customerBuildPrompt,
  strategy: strategyBuildPrompt,
  investor: investorBuildPrompt,
  unicorn_founder: unicornFounderBuildPrompt,
  solo_entrepreneur: soloEntrepreneurBuildPrompt,
};

const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  cto: 'CTO / Technical Leadership',
  security: 'Security Expert',
  product: 'Product / Business Expert',
  devops: 'DevOps / Infrastructure Expert',
  customer: 'Target Customer',
  strategy: 'Strategy / Business Leadership',
  investor: 'Investor / VC Partner',
  unicorn_founder: 'Unicorn Founder',
  solo_entrepreneur: 'Solo Entrepreneur',
};

export function buildReviewPrompt(
  context: ProjectContext,
  perspectives?: Perspective[],
  customerRole?: string,
  focus?: string,
): string {
  const selected = perspectives && perspectives.length > 0
    ? perspectives
    : ALL_PERSPECTIVES;

  const sections = selected.map(p => {
    const builder = PROMPT_BUILDERS[p];
    const prompt = builder(context, customerRole);
    const label = PERSPECTIVE_LABELS[p];
    return `\n## ${label} Review\n\n${prompt}`;
  });

  const focusBlock = focus
    ? [
        '',
        `**Review Focus**: ${focus}`,
        '',
        '> IMPORTANT: You have full project context above, but focus your review specifically on the area described.',
        '> All findings should be evaluated in the context of the full project (tech stack, architecture, dependencies),',
        '> but only flag issues and give recommendations relevant to this focus area.',
        '> Do NOT review unrelated parts of the project.',
      ].join('\n')
    : '';

  const header = [
    `# ${focus ? 'Focused Review' : 'Architecture Review'}: ${context.name}`,
    '',
    `**Tech Stack**: ${context.techStack.join(', ') || 'Not detected'}`,
    `**Files**: ${context.stats.totalFiles} | **Tests**: ${context.stats.testFiles} | **Code Lines**: ~${context.stats.codeLines}`,
    focusBlock,
    '',
    '---',
    '',
    'Please conduct the following reviews. For each perspective, categorize findings as:',
    '- **MUST FIX**: Critical issues blocking production readiness',
    '- **SHOULD FIX**: Important improvements with clear ROI',
    '- **GOOD**: Confirmed correct decisions worth keeping',
    '',
    'Be specific: reference file paths, function names, and line numbers where possible.',
    'Estimate effort saved or cost of inaction for each finding.',
    '',
    '---',
    '',
    '## Executive Summary (generate this FIRST)',
    '',
    'Before diving into individual perspectives, provide a 30-second overview:',
    '',
    '```',
    'MUST FIX:   [count] critical issues',
    'SHOULD FIX: [count] improvements',
    'GOOD:       [count] confirmed correct',
    '',
    'Most important finding: [one sentence — the single thing to fix first]',
    'Estimated effort saved by addressing all MUST FIX items: [X days]',
    '```',
    '',
    'Then proceed with the detailed perspective reviews below.',
    ...(selected.length > 5
      ? [
          '',
          '> **Tip**: This review has ' + selected.length + ' perspectives. If Sequential Thinking MCP (`sequentialthinking`) is available, use it to process each perspective as a separate thought step. This prevents quality degradation in later perspectives.',
        ]
      : []),
  ].join('\n');

  const footer = [
    '',
    '---',
    '',
    '## After Review: Add to Todo List',
    '',
    'After completing the review, add each finding to the project todo list using the `todo_add` tool:',
    '- MUST FIX items → priority: "must"',
    '- SHOULD FIX items → priority: "should"',
    '- Set source to the perspective name (e.g. "CTO review", "Security review")',
    '- GOOD items do not need to be added (they confirm correct decisions)',
    '',
    'This ensures no finding is forgotten and progress can be tracked across reviews.',
  ].join('\n');

  return header + '\n' + sections.join('\n\n---\n') + footer;
}
