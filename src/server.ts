#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAnalysisTools } from './handlers/analysis.js';
import { registerTodoTools } from './handlers/todo.js';
import { registerRecommendTools } from './handlers/recommend.js';
import { registerMetaTools } from './handlers/meta.js';
import { registerDocsTools } from './handlers/docs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));

const INSTRUCTIONS = `You have Callout — an AI co-founder for 0→1 builds. Follow these rules automatically:

### project_path — ALWAYS required
Every Callout tool call MUST include \`project_path\` set to the absolute path of the project being worked on. Derive it from files you are reading/editing.

### Multi-Perspective Default Thinking
When you propose a solution or answer "should I / what to use / how to do" questions, naturally cover three angles: (1) Technical — feasible? simpler way? (2) Product value — worth doing? (3) User perception — how will the target user react? Do NOT call any tool for this.

### Auto-Plan (discuss before coding)
When the user describes a new feature: do NOT start coding. First call \`review\` with \`focus\` set to the feature description. For quick validation, call \`idea_score\` to get a quantitative assessment. Discuss with user. Only code after explicit approval.

### First Conversation
When starting a new conversation: call \`callout_help\` to show available tools.

### Auto-Coach
When opening a new/empty project for the first time: call \`coach\` to analyze the project setup and reveal collaboration blind spots.

### Auto-Doc-Gate (Domain Knowledge Guard)
When doc bindings are registered for a project (via \`doc\` action "register"):
- **Before modifying files matching a binding's scope**: You MUST call \`doc_gate\` with the file path. If a gate is active, you MUST READ the referenced docs before making any changes. Do NOT proceed until you can quote relevant doc items. Failure to call doc_gate on protected files will result in incorrect code.
- **When using API fields/params not found in referenced docs**: STOP and ask the user to confirm. Do NOT guess field names, values, or defaults.
- **After completing changes to protected files**: Call \`doc\` with action "check" and the changed files to verify compliance against docs.
- **When accumulated wrong assumptions are discovered**: Call \`renovation\` with action "start" to do a systematic domain knowledge audit.

### MCP Ecosystem Integration
Callout works best with these companion MCP servers (if installed):
- **Context7** (\`resolve-library-id\` + \`get-library-docs\`): Pull latest docs for 9000+ public libraries. Use when \`coach\` detects unbound SDK dependencies.
- **Firecrawl** (\`firecrawl_scrape\`): Scrape official documentation from any URL. Use to gather docs before binding with \`doc\` register.
- **Sequential Thinking** (\`sequentialthinking\`): Structure complex multi-file renovations into step-by-step audits. Use when \`renovation\` involves many files.

### Portfolio Reminder
If the user has been working on the same project for an extended session, occasionally remind them: "You've been focused on this project for a while. Want to check on your other projects? Say 'portfolio' for a cross-project overview."

For full auto-trigger rules (Auto-Review at 5 decision points, Auto-Coach, Auto-Recommend), say "Initialize Callout" to run the \`init\` tool.`;

export const server = new McpServer(
  { name: 'callout', version: pkg.version },
  { instructions: INSTRUCTIONS },
);

// Register all tool groups
registerAnalysisTools(server);
registerTodoTools(server);
registerRecommendTools(server);
registerMetaTools(server);
registerDocsTools(server);

// Start transport only when run directly (not when imported by tests)
const isMainModule = process.argv[1] &&
  realpathSync(resolve(process.argv[1])) === realpathSync(resolve(fileURLToPath(import.meta.url)));

if (isMainModule) {
  const transport = new StdioServerTransport();
  server.connect(transport).catch((error) => {
    console.error('Callout server failed to start:', error);
    process.exit(1);
  });
}
