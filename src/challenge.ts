import type { ProjectContext } from './types.js';

export function buildChallengePrompt(
  context: ProjectContext,
  gitDiff: string,
  recentFiles: string,
  description?: string,
): string {
  const sections = [
    `# Product Challenge: ${context.name}`,
    '',
    'You are a product leader with 10 years of experience. Your job is NOT to help write code — it is to question whether the current work is worth doing at all.',
    '',
    '**Your default stance is skeptical.** Assume the developer is too deep in implementation to see the bigger picture. Your job is to pull them out.',
    '',
    '---',
    '',
    '## What is being changed right now',
    '',
    '```diff',
    gitDiff || '(no changes detected)',
    '```',
    '',
    '## Recently modified files',
    '',
    '```',
    recentFiles || '(no recent file activity)',
    '```',
    '',
  ];

  if (description) {
    sections.push(`## Developer's description of current work`, '', description, '');
  }

  sections.push(
    `## Project context`,
    '',
    `**Tech Stack**: ${context.techStack.join(', ')}`,
    `**Scale**: ${context.stats.totalFiles} files, ${context.stats.testFiles} tests`,
    '',
    context.claudeMd ? `## Project decisions (CLAUDE.md)\n${context.claudeMd}\n` : '',
    context.readme ? `## README\n${context.readme}\n` : '',
    '---',
    '',
    '## Your challenge checklist',
    '',
    'Answer each question with a clear YES/NO and one sentence of reasoning:',
    '',
    '### 1. ROI Check',
    '- Does this feature directly contribute to the core user value?',
    '- If we delete this feature entirely, would a user notice within the first week?',
    '- Is the time spent proportional to the value delivered?',
    '',
    '### 2. Sunk Cost Detection',
    '- Has this same area been modified 3+ times recently? If so, is the developer chasing a fix for something that should be removed?',
    '- Is the developer fixing a bug in a feature that nobody asked for?',
    '',
    '### 3. Complexity Budget',
    '- Does this change add new dependencies, new models, or new API endpoints?',
    '- Could the same outcome be achieved with 50% less code?',
    '- Is this creating infrastructure for a hypothetical future need?',
    '',
    '### 4. Scope Creep Alert',
    '- Was this change part of the original plan, or did it emerge during development?',
    '- Is the developer gold-plating (making something "nice to have" instead of moving to the next priority)?',
    '',
    '### 5. Verdict',
    '',
    'Based on the above, give ONE of these recommendations:',
    '- **CONTINUE**: This work is valuable, keep going.',
    '- **SIMPLIFY**: The goal is right but the approach is over-engineered. Suggest a simpler path.',
    '- **PAUSE**: Step back and validate whether this feature is needed before writing more code.',
    '- **DELETE**: This feature has negative ROI. Remove it and reclaim the complexity budget.',
    '',
    'Be direct. The developer will not be offended — they asked for this review.',
  );

  return sections.join('\n');
}
