import type { ProjectContext } from '../types.js';

export function buildTestTranslatePrompt(testOutput: string, ctx: ProjectContext): string {
  return `You are helping a non-technical founder understand what their test results mean and what they still need to verify manually.

## Project
- **Name**: ${ctx.name}
- **Tech Stack**: ${ctx.techStack.join(', ')}
- **Scale**: ${ctx.stats.totalFiles} files, ${ctx.stats.testFiles} test files, ~${ctx.stats.codeLines} lines

## Test Output
\`\`\`
${testOutput}
\`\`\`

## Your Task

Translate this test output into plain language for someone who doesn't read code. Then tell them exactly what they still need to verify by hand.

## Output Format

### What the tests cover (automated — you don't need to test these)
List in plain language what the passing tests verify. Group by feature area. Keep it brief.

### What failed (if any)
For each failing test:
- **What broke**: plain language description
- **Why it matters**: user impact
- **Fix direction**: one-sentence hint

### What you still need to test manually
List only the things automated tests CANNOT verify: UI flows, email delivery, payment processing, third-party integrations, mobile behavior, etc.
For each item:
- What to test
- How to test it (specific steps)
- What "passing" looks like

### 15-minute manual test script
A step-by-step checklist. Number each step. Start from the most critical user journey. Stop at 15 minutes worth of testing.

---
Keep the language simple. Assume the reader has never read a test file.`;
}
