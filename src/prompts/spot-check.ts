export function buildSpotCheckPrompt(code: string, filename?: string): string {
  const fileHint = filename ? `File: \`${filename}\`` : 'Code snippet (no filename provided)';

  return `You are a security-focused code reviewer doing a fast spot-check of AI-generated code.

## Context
${fileHint}

## Code to Review
\`\`\`
${code}
\`\`\`

## Your Task

Scan this code for **dangerous issues only**. Skip style, performance, and minor improvements — only flag things that could cause:
- Security vulnerabilities (injection, auth bypass, data exposure, path traversal, etc.)
- Logic errors that silently corrupt data or produce wrong results
- Unsafe operations (unchecked user input reaching shell/DB/filesystem, hardcoded secrets)

## Output Format

If issues found, list each as:
**[SEVERITY]** — *Issue type*
What the problem is and exactly which line/pattern causes it.
How to fix it (one sentence).

Severity levels:
- **CRITICAL** — exploitable now, must fix before using this code
- **HIGH** — likely exploitable, fix before shipping
- **MEDIUM** — risk exists but requires specific conditions

If no dangerous issues found, say:
**No dangerous issues found.** This code looks safe to use. (Note any minor concerns if relevant.)

Do not explain what the code does. Do not suggest improvements. Only flag dangerous issues.`;
}
