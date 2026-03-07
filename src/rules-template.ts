/**
 * CLAUDE.md auto-trigger rules template.
 * Users copy this into their project's CLAUDE.md to enable automatic Callout triggers.
 */
export const RULES_VERSION = '4';

export const RULES_TEMPLATE = `
<!-- callout-rules-version:${RULES_VERSION} -->
## Callout Auto-Trigger Rules

When Callout MCP server is available, follow these rules automatically:

### project_path — ALWAYS required
Every Callout tool call MUST include \`project_path\` set to the absolute path of the project currently being worked on.
Derive it from the files you are reading or editing — do NOT rely on the default (process.cwd() of the MCP server is fixed at launch and will point to the wrong directory if the user did not start the CLI from the project root).

Example: if you are editing \`/Users/alice/projects/my-app/src/auth.ts\`, pass \`project_path: "/Users/alice/projects/my-app"\`.

### First Conversation
- **When starting a new conversation with the user for the first time** (no prior messages in the session): Call \`callout_help\` and show the user what Callout can do. This ensures every user discovers the available tools without having to read documentation.

### Auto-Challenge (use the \`challenge\` tool)
- **Before creating a new file**: Challenge whether this new module/component is necessary
- **When modifying the same file for the 3rd+ time in a session**: Challenge whether you are chasing a bug in a low-value feature
- **Before adding a new dependency**: Challenge whether a simpler alternative exists
- **When a bug fix exceeds 30 minutes**: Challenge whether the buggy feature should be simplified or removed

### Auto-Plan (discuss before coding)
- **When the user describes a new feature or requirement**: Do NOT start writing code immediately. First call \`challenge\` (is this worth building?) and \`validate\` (what's the best approach?). Discuss architecture, scope, and trade-offs with the user. Only start implementation after the user explicitly says "go ahead", "start coding", "implement it", or similar confirmation.
- **When opening a new/empty project for the first time**: Call \`guide\` to discuss project planning — stage, priorities, and what to build first. Do not generate boilerplate or scaffold code until the user confirms the plan.
- **When the user asks to add a major dependency or service** (database, auth, payments, etc.): Call \`validate\` to discuss alternatives before installing or integrating anything.

### Auto-Review (use the \`review\` tool)
- **After completing a major feature or milestone**: Run a full 5-perspective review
- **Before creating a pull request**: Run CTO + Security perspectives at minimum
- **When starting work on a new project**: Run a full review to understand the codebase

### Rules
- **Plan before code**: When Auto-Plan triggers, stay in discussion mode. Present findings, ask questions, and wait for the user to decide. Do not write files, install packages, or generate code until the user explicitly approves the approach.
- **Discussion ≠ inaction**: During Auto-Plan, actively use Callout tools to provide structured analysis. The goal is informed decision-making, not delays.
- When challenge returns DELETE or PAUSE: Stop current work, present the finding to the user, and wait for their decision before continuing
- When challenge returns SIMPLIFY: Present the simpler approach and ask the user which path to take
- When challenge returns CONTINUE: Proceed without interruption
- Do NOT suppress or summarize Callout's findings — show them in full

### Auto-Recommend (use the \`recommend\` tool)
- **When the user starts building a feature that needs a new tool category** (auth, payments, database, email, file uploads, search, analytics, monitoring, deployment): Call \`recommend\` with a \`task\` description so Callout can suggest the best tool for their situation.
- **When the user asks "what should I use for X?"**: Call \`recommend\` with the question as the \`task\`.
- Callout tracks which scenarios have already been recommended — the same scenario will not be suggested twice.
- If the user says they don't need a recommendation, call \`recommend_dismiss\` to suppress that scenario.
`.trim();
