import type { ProjectContext } from '../types.js';
import type { DocBinding, RenovationRecord } from '../docs.js';

export function buildRenovationPrompt(
  context: ProjectContext,
  binding: DocBinding,
  docContents: Record<string, string>,
  previousRecords: RenovationRecord[],
  batch: number,
): string {
  const lines = [
    '# Domain Knowledge Renovation',
    '',
    `You are conducting a **systematic renovation** of the \`${binding.domain}\` domain in this project. This is not a code review — this is a **knowledge audit** that compares every piece of code against official documentation to find gaps, wrong assumptions, and missed opportunities.`,
    '',
    '## Project Context',
    '',
    `**Project**: ${context.name}`,
    `**Tech Stack**: ${context.techStack.join(', ') || 'Unknown'}`,
    `**Domain**: ${binding.domain}`,
    `**Protected scope**: ${binding.scope.join(', ')}`,
    `**Batch**: ${batch}`,
    '',
  ];

  // Previous renovation context
  if (previousRecords.length > 0) {
    lines.push('## Previous Renovation Batches', '');
    for (const r of previousRecords) {
      const status = r.status === 'completed' ? 'DONE' : 'IN PROGRESS';
      lines.push(`### Batch ${r.batch} [${status}]`);
      if (r.discoveries.length > 0) {
        lines.push('Discoveries:');
        for (const d of r.discoveries) lines.push(`  - ${d}`);
      }
      if (r.fixes.length > 0) {
        lines.push('Fixes applied:');
        for (const f of r.fixes) lines.push(`  - ${f}`);
      }
      lines.push('');
    }
    lines.push('Build on previous findings. Do NOT repeat already-fixed issues.', '');
  }

  lines.push('## Reference Documentation', '');
  for (const [path, content] of Object.entries(docContents)) {
    lines.push(`### ${path}`, '');
    lines.push('```');
    lines.push(content.length > 15000 ? content.slice(0, 15000) + '\n...(truncated)' : content);
    lines.push('```');
    lines.push('');
  }

  if (context.fileTree) {
    lines.push('## Project File Tree (relevant scope)', '');
    lines.push('```');
    lines.push(context.fileTree);
    lines.push('```');
    lines.push('');
  }

  lines.push(
    '## Step 1: Find Problems',
    '',
    'Compare every API call, config value, field name, and parameter in the scoped files against the documentation. Also look for documented features the code doesn\'t use yet.',
    '',
    'For each finding:',
    '```',
    '[WRONG] file:line — What code says vs what docs say',
    '[GUESS] file:line — Value has no source in docs, likely guessed',
    '[OUTDATED] file:line — Uses old API version, docs show newer approach',
    '[NEW] feature — Documented capability not yet used, why it helps',
    '[BETTER] current → recommended — Docs suggest a better approach',
    '```',
    '',
    '## Step 2: Fix Plan',
    '',
    'Prioritize all findings into an actionable list:',
    '',
    '| Priority | File:Line | Problem | Fix (current → correct) | Doc Reference |',
    '|----------|-----------|---------|-------------------------|---------------|',
    '| MUST FIX | ... | Wrong field/value, will cause bugs | ... | ... |',
    '| SHOULD FIX | ... | Outdated pattern, missing safety | ... | ... |',
    '| OPPORTUNITY | ... | New feature/optimization | ... | ... |',
    '',
    '## Plain Language Summary',
    '',
    'End with a short paragraph explaining:',
    '- How many problems were found vs how many are correct',
    '- Whether the code is safe to ship or needs fixes first',
    '- What new capabilities from the docs could improve the product',
    '',
    '---',
    '',
    '## Renovation Strategy',
    '',
    'If this renovation involves many files or complex cross-file dependencies, use **Sequential Thinking MCP** (`sequentialthinking` tool, if installed) to decompose the audit:',
    '',
    '```',
    'Thought 1: List all files in scope and categorize by function (config, API calls, types, tests)',
    'Thought 2: For each file, compare every API field/param/config against documentation — mark WRONG/GUESS/OUTDATED',
    'Thought 3: Cross-check consistency across files (e.g., field name in type definition vs usage vs test)',
    'Thought 4: Identify documented features not yet used (opportunities)',
    'Thought 5: Prioritize all findings into MUST FIX / SHOULD FIX / OPPORTUNITY',
    '```',
    '',
    'This structured approach prevents skipping files or missing cross-file inconsistencies.',
    '',
    '## After Renovation — Required Follow-up',
    '',
    '1. Call `renovation` with action "save" to record discoveries and fixes',
    `2. Call \`doc\` with action "check" on all modified files to confirm compliance`,
    `3. Call \`review\` with perspectives ["cto"] and focus "${binding.domain} renovation architecture verification" for architecture sign-off`,
    '',
    'Do steps 1-2 immediately. Step 3 is recommended but can be deferred.',
  );

  return lines.join('\n');
}
