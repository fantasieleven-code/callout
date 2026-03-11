import type { ProjectContext } from '../types.js';
import type { DocBinding } from '../docs.js';

export function buildDocCheckPrompt(
  context: ProjectContext,
  bindings: DocBinding[],
  changedFiles: string[],
  docContents: Record<string, string>,
  codeContents?: Record<string, string>,
): string {
  const lines = [
    '# Domain Knowledge Guard — Documentation Compliance Check',
    '',
    'You are a **documentation compliance auditor**. Your job is to verify that code changes align with official documentation. You are skeptical by default — assume the code is wrong until proven correct against the docs.',
    '',
    '## Project Context',
    '',
    `**Project**: ${context.name}`,
    `**Tech Stack**: ${context.techStack.join(', ') || 'Unknown'}`,
    '',
    '## Registered Domain Bindings',
    '',
  ];

  for (const binding of bindings) {
    lines.push(`### ${binding.domain}`);
    lines.push(`- **Rule**: ${binding.rule}`);
    lines.push(`- **Protected scope**: ${binding.scope.join(', ')}`);
    lines.push(`- **Reference docs**: ${binding.docs.join(', ')}`);
    lines.push('');
  }

  lines.push('## Reference Documentation', '');
  for (const [path, content] of Object.entries(docContents)) {
    lines.push(`### ${path}`, '');
    lines.push('```');
    lines.push(content.length > 15000 ? content.slice(0, 15000) + '\n...(truncated)' : content);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Changed Code (to verify)', '');
  if (codeContents && Object.keys(codeContents).length > 0) {
    for (const [path, content] of Object.entries(codeContents)) {
      lines.push(`### ${path}`, '');
      lines.push('```');
      lines.push(content);
      lines.push('```');
      lines.push('');
    }
  } else {
    for (const f of changedFiles) {
      lines.push(`- \`${f}\``);
    }
    lines.push('', '(Code contents not available — read these files before verifying)', '');
  }

  lines.push(
    '## Common AI Mistake Patterns',
    '',
    'Pay special attention to these frequent AI coding errors:',
    '',
    '- **Verb tense**: `onUserJoin` vs `onUserJoined`, `handleConnect` vs `handleConnected`',
    '- **Naming style**: `room_id` vs `roomId` vs `RoomId` — match the SDK convention exactly',
    '- **Unit suffix**: `timeout` vs `timeoutMs` vs `timeoutMillis` vs `timeoutSeconds`',
    '- **Version drift**: v1 field names used with v2 SDK, or vice versa',
    '- **Default values**: AI often invents plausible defaults (10s, 30s, 1024) that don\'t match docs',
    '- **Enum values**: `"high"` vs `"HIGH"` vs `1` — check exact enum type and casing',
    '',
    '## Your Task',
    '',
    'For each changed file, verify against the documentation:',
    '',
    '1. **Field Names**: Are all API field names, parameter names, and config keys exactly as documented? Flag any that don\'t appear in the docs.',
    '2. **Values & Defaults**: Are values (timeouts, sizes, rates, enum values) consistent with docs? Flag any that look "guessed".',
    '3. **API Usage**: Are APIs called correctly (method, path, headers, body format)? Flag any undocumented usage.',
    '4. **Missing Features**: Are there documented capabilities that the code doesn\'t use but should?',
    '5. **Deprecated Patterns**: Is the code using deprecated APIs or patterns that docs say to avoid?',
    '',
    '## Output Format',
    '',
    'For each finding:',
    '```',
    '[WRONG] file.ts:field_name — Code uses "onUserJoin", docs say "onUserJoined"',
    '[GUESS] file.ts:timeout — Code uses 10s, docs recommend 30s. No source for 10s.',
    '[MISSING] file.ts — Docs describe batch API that could replace N+1 calls',
    '[DEPRECATED] file.ts:method — Docs mark this as deprecated since v2.3',
    '[OK] file.ts:config — Matches docs exactly',
    '```',
    '',
    '## Plain Language Summary',
    '',
    'End with a one-paragraph summary a non-technical founder can understand:',
    '- How many fields/configs were checked',
    '- How many are correct vs wrong',
    '- Whether it\'s safe to ship or needs fixes first',
    '',
    'Then give the **Compliance Score**: X/Y fields verified correct.',
    '',
    'If compliance is below 80%, recommend running `renovation` for a full domain knowledge audit.',
    '',
    '---',
    '',
    '## Save Score (required)',
    '',
    'After completing the check, you MUST save the compliance score by calling `doc` with:',
    '- action: "check"',
    '- domain: the domain name',
    '- compliance_correct: number of correct fields',
    '- compliance_total: total fields checked',
    '',
    'This tracks compliance trends over time. Declining scores trigger automatic warnings.',
  );

  return lines.join('\n');
}

export function buildDocGatePrompt(
  binding: DocBinding,
  targetFile: string,
): string {
  return [
    '# DOMAIN KNOWLEDGE GATE — Action Required',
    '',
    `You are about to modify \`${targetFile}\` which is protected by a domain knowledge rule:`,
    '',
    `> **${binding.rule}**`,
    '',
    `**Domain**: ${binding.domain}`,
    `**Required docs**: ${binding.docs.join(', ')}`,
    '',
    '## MANDATORY — Do NOT skip these steps:',
    '',
    '1. **Read the documentation files** listed above — do this NOW before any edits',
    '2. **Identify the specific APIs/fields/configs** you will use in this change',
    '3. **Verify each one exists in the docs** — quote the relevant doc section as proof',
    '4. If ANY field, parameter, or config value is uncertain, **STOP and ASK the user**',
    '',
    '## Common AI Mistakes to Avoid:',
    '',
    '- Do NOT guess field names — check exact spelling, casing, and naming convention',
    '- Do NOT invent default values — use the documented defaults or ask',
    '- Do NOT assume API behavior from similar SDKs — each SDK has its own conventions',
    '- Do NOT use v1 patterns if docs describe v2, or vice versa',
    '',
    'DO NOT proceed with any file edits until you have read the docs and can quote at least 3 relevant items from the documentation that relate to your planned change.',
    '',
    'If you cannot find a field/API in the docs, say:',
    '> "I cannot find [X] in the documentation. Should I proceed with [assumption] or do you have additional docs?"',
  ].join('\n');
}
