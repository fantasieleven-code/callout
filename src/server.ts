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

export const server = new McpServer({
  name: 'callout',
  version: pkg.version,
});

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
