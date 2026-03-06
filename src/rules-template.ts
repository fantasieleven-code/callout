/**
 * CLAUDE.md auto-trigger rules template.
 * Users copy this into their project's CLAUDE.md to enable automatic Callout triggers.
 */
export const RULES_TEMPLATE = `
## Callout Auto-Trigger Rules

When Callout MCP server is available, follow these rules automatically:

### project_path — ALWAYS required
Every Callout tool call MUST include \`project_path\` set to the absolute path of the project currently being worked on.
Derive it from the files you are reading or editing — do NOT rely on the default (process.cwd() of the MCP server is fixed at launch and will point to the wrong directory if the user did not start the CLI from the project root).

Example: if you are editing \`/Users/alice/projects/my-app/src/auth.ts\`, pass \`project_path: "/Users/alice/projects/my-app"\`.

### Auto-Challenge (use the \`challenge\` tool)
- **Before creating a new file**: Challenge whether this new module/component is necessary
- **When modifying the same file for the 3rd+ time in a session**: Challenge whether you are chasing a bug in a low-value feature
- **Before adding a new dependency**: Challenge whether a simpler alternative exists
- **When a bug fix exceeds 30 minutes**: Challenge whether the buggy feature should be simplified or removed

### Auto-Review (use the \`review\` tool)
- **After completing a major feature or milestone**: Run a full 5-perspective review
- **Before creating a pull request**: Run CTO + Security perspectives at minimum
- **When starting work on a new project**: Run a full review to understand the codebase

### Rules
- When challenge returns DELETE or PAUSE: Stop current work, present the finding to the user, and wait for their decision before continuing
- When challenge returns SIMPLIFY: Present the simpler approach and ask the user which path to take
- When challenge returns CONTINUE: Proceed without interruption
- Do NOT suppress or summarize Callout's findings — show them in full
`.trim();
