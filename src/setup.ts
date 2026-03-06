#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RULES_TEMPLATE } from './rules-template.js';

interface McpConfig {
  mcpServers?: Record<string, { command: string; args?: string[] }>;
}

const ARCHON_MCP_ENTRY = {
  command: 'archon',
  args: [] as string[],
};

const MCP_TARGETS = [
  {
    name: 'Claude Code',
    path: (cwd: string) => join(cwd, '.mcp.json'),
  },
  {
    name: 'Cursor',
    path: (cwd: string) => join(cwd, '.cursor', 'mcp.json'),
  },
  {
    name: 'VS Code',
    path: (cwd: string) => join(cwd, '.vscode', 'mcp.json'),
  },
];

function log(msg: string) {
  console.log(`  ${msg}`);
}

function writeMcpConfig(filePath: string, toolName: string): boolean {
  let config: McpConfig = {};

  if (existsSync(filePath)) {
    try {
      config = JSON.parse(readFileSync(filePath, 'utf-8')) as McpConfig;
    } catch {
      config = {};
    }
  }

  if (config.mcpServers?.archon) {
    log(`⏭  ${toolName}: already configured`);
    return false;
  }

  config.mcpServers = config.mcpServers || {};
  config.mcpServers.archon = ARCHON_MCP_ENTRY;

  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n');
  log(`✅ ${toolName}: configured at ${filePath}`);
  return true;
}

function appendClaudeMdRules(cwd: string): boolean {
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  let content = '';

  if (existsSync(claudeMdPath)) {
    content = readFileSync(claudeMdPath, 'utf-8');
    if (content.includes('Archon Auto-Trigger Rules')) {
      log('⏭  CLAUDE.md: auto-trigger rules already present');
      return false;
    }
    content += '\n\n';
  }

  content += RULES_TEMPLATE + '\n';
  writeFileSync(claudeMdPath, content);
  log('✅ CLAUDE.md: auto-trigger rules added');
  return true;
}

function detectInstalledTools(cwd: string): string[] {
  const detected: string[] = [];

  // Check if common tool config dirs exist
  if (existsSync(join(cwd, '.cursor'))) detected.push('Cursor');
  if (existsSync(join(cwd, '.vscode'))) detected.push('VS Code');

  // Claude Code is always a target (it's a simple .mcp.json)
  detected.push('Claude Code');

  return detected;
}

export function setup(cwd?: string): void {
  const projectDir = resolve(cwd || process.cwd());

  console.log('');
  console.log('🏛  Archon Setup');
  console.log(`  Project: ${projectDir}`);
  console.log('');

  // Step 1: Write MCP configs
  console.log('  Setting up MCP configs...');
  let configured = 0;
  for (const target of MCP_TARGETS) {
    const filePath = target.path(projectDir);
    // Always configure Claude Code; others only if their dir exists
    if (target.name === 'Claude Code' || existsSync(filePath.substring(0, filePath.lastIndexOf('/')))) {
      if (writeMcpConfig(filePath, target.name)) configured++;
    }
  }

  console.log('');

  // Step 2: Append CLAUDE.md rules
  console.log('  Setting up auto-trigger rules...');
  appendClaudeMdRules(projectDir);

  console.log('');
  console.log('  Done! Restart your editor, then try:');
  console.log('  → "Review this project"');
  console.log('  → "Challenge what I\'m working on"');
  console.log('');
}

// CLI entry point
const args = process.argv.slice(2);
if (args[0] === 'setup') {
  setup(args[1]);
}
