/**
 * CLAUDE.md auto-trigger rules template.
 * Users copy this into their project's CLAUDE.md to enable automatic Callout triggers.
 */
export const RULES_VERSION = '6';

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

### Multi-Perspective Default Thinking
When you propose a solution, give advice, or answer "should I / what to use / how to do" type questions, naturally cover three angles in your response:
1. **Technical** — Is it feasible? What's the cost? Is there a simpler way?
2. **Product value** — Is it worth doing? Does the user care?
3. **User perception** — How will the target user react? Will they actually use it?

Do NOT call any tool for this — just incorporate these angles directly into your answer. This is your default thinking mode for all recommendations.
When deeper analysis is needed, the user can say "detailed analysis" or "详细分析" to trigger \`review(focus=...)\`.

### Auto-Challenge (use the \`challenge\` tool)
- **Before creating a new file**: Challenge whether this new module/component is necessary
- **When modifying the same file for the 3rd+ time in a session**: Challenge whether you are chasing a bug in a low-value feature
- **Before adding a new dependency**: Challenge whether a simpler alternative exists
- **When a bug fix exceeds 30 minutes**: Challenge whether the buggy feature should be simplified or removed

### Auto-Plan (discuss before coding)
- **When the user describes a new feature or requirement**: Do NOT start writing code immediately. First call \`challenge\` (is this worth building?) and \`review\` with \`focus\` set to the feature description (what do experts think?). Discuss architecture, scope, and trade-offs with the user. Only start implementation after the user explicitly says "go ahead", "start coding", "implement it", or similar confirmation.
- **When opening a new/empty project for the first time**: Call \`guide\` to discuss project planning — stage, priorities, and what to build first. Do not generate boilerplate or scaffold code until the user confirms the plan.
- **When the user asks to add a major dependency or service** (database, auth, payments, etc.): Call \`validate\` to discuss alternatives before installing or integrating anything.

### Auto-Review (use the \`review\` tool with \`focus\` parameter)

The \`review\` tool has a \`focus\` parameter — use it to zoom into a specific feature/page/decision while keeping full project context. This makes reviews fast and targeted. Trigger at these 5 decision points:

1. **Plan stage** — When the user describes a feature to build: \`review(focus="the feature", perspectives=["cto", "product", "customer"])\`. Catches wrong priorities and ensures the user actually wants this.
2. **Stuck/pivot** — When the user changes approach, expresses doubt, or has been stuck for a while: \`review(focus="the problematic area", perspectives=["cto", "customer"])\`. Surfaces whether the approach is wrong or the feature isn't worth it.
3. **Feature complete** — When the user finishes a feature or module: \`review(focus="what was just built")\` with all perspectives. This is the most thorough check.
4. **Pre-ship** — Before creating a PR or deploying: \`review(focus="changes in this PR", perspectives=["security", "devops", "customer"])\`. Last line of defense.
5. **Direction check** — When the user asks "what should I do next?" or seems unsure about priorities: \`review(perspectives=["product", "customer"])\` without focus to re-evaluate the whole project direction.

**Customer perspective is included in ALL 5 trigger points.** The review tool auto-detects who the target user is from the project's README/CLAUDE.md. If not detected, use \`set_target_user\` to set it once — all future reviews will use it. When auto-triggering, pick the 2-3 most relevant additional perspectives beyond customer.

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
