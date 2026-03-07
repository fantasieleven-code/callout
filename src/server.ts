#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAnalysisTools } from './handlers/analysis.js';
import { registerTodoTools } from './handlers/todo.js';
import { registerRecommendTools } from './handlers/recommend.js';
import { registerMetaTools } from './handlers/meta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));

const INSTRUCTIONS = `You have Callout — an AI co-founder for 0→1 builds. Follow these rules automatically:

### project_path — ALWAYS required
Every Callout tool call MUST include \`project_path\` set to the absolute path of the project being worked on. Derive it from files you are reading/editing.

### Multi-Perspective Default Thinking
When you propose a solution or answer "should I / what to use / how to do" questions, naturally cover three angles: (1) Technical — feasible? simpler way? (2) Product value — worth doing? (3) User perception — how will the target user react? Do NOT call any tool for this.

### Auto-Plan (discuss before coding)
When the user describes a new feature: do NOT start coding. First call \`challenge\` and \`review\` with \`focus\` set to the feature. Discuss with user. Only code after explicit approval.

### First Conversation
When starting a new conversation: call \`callout_help\` to show available tools.

For full auto-trigger rules (Auto-Challenge, Auto-Review at 5 decision points, Auto-Recommend), say "Initialize Callout" to run the \`init\` tool.`;

export const server = new McpServer(
  { name: 'callout', version: pkg.version },
  { instructions: INSTRUCTIONS },
);

// Register all tool groups
registerAnalysisTools(server);
registerTodoTools(server);
registerRecommendTools(server);
registerMetaTools(server);

// Start transport only when run directly (not when imported by tests)
const isMainModule = process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  const transport = new StdioServerTransport();
  server.connect(transport).catch((error) => {
    console.error('Callout server failed to start:', error);
    process.exit(1);
  });
}
