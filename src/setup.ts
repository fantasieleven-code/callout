#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { RULES_TEMPLATE, RULES_VERSION } from './rules-template.js';

interface McpConfig {
  mcpServers?: Record<string, { command: string; args?: string[] }>;
}

const CALLOUT_MCP_ENTRY = {
  command: 'npx',
  args: ['callout-dev'],
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

  if (config.mcpServers?.callout) {
    log(`⏭  ${toolName}: already configured`);
    return false;
  }

  config.mcpServers = config.mcpServers || {};
  config.mcpServers.callout = CALLOUT_MCP_ENTRY;

  const dir = dirname(filePath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n');
  log(`✅ ${toolName}: configured at ${filePath}`);
  return true;
}

// All rule files that different coding tools auto-read
const RULE_FILES = [
  { name: 'CLAUDE.md', path: (cwd: string) => join(cwd, 'CLAUDE.md') },
  { name: '.cursorrules', path: (cwd: string) => join(cwd, '.cursorrules') },
  { name: '.windsurfrules', path: (cwd: string) => join(cwd, '.windsurfrules') },
  { name: '.github/copilot-instructions.md', path: (cwd: string) => join(cwd, '.github', 'copilot-instructions.md') },
];

function appendRulesToFile(filePath: string, fileName: string): boolean {
  let content = '';

  if (existsSync(filePath)) {
    content = readFileSync(filePath, 'utf-8');

    if (content.includes('Callout Auto-Trigger Rules')) {
      // Check if rules need updating
      const versionMatch = content.match(/<!-- callout-rules-version:(\d+) -->/);
      const existingVersion = versionMatch ? versionMatch[1] : '0';

      if (existingVersion >= RULES_VERSION) {
        log(`⏭  ${fileName}: auto-trigger rules already up to date (v${RULES_VERSION})`);
        return false;
      }

      // Replace old rules with new version
      const rulesStart = content.indexOf('<!-- callout-rules-version:');
      const fallbackStart = rulesStart === -1 ? content.indexOf('## Callout Auto-Trigger Rules') : rulesStart;
      if (fallbackStart !== -1) {
        content = content.substring(0, fallbackStart).trimEnd() + '\n\n' + RULES_TEMPLATE + '\n';
        writeFileSync(filePath, content);
        log(`🔄 ${fileName}: auto-trigger rules updated to v${RULES_VERSION}`);
        return true;
      }
    }

    content += '\n\n';
  }

  // Ensure parent directory exists
  const dir = dirname(filePath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  content += RULES_TEMPLATE + '\n';
  writeFileSync(filePath, content);
  log(`✅ ${fileName}: auto-trigger rules added`);
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
  console.log('📣  Callout Setup');
  console.log(`  Project: ${projectDir}`);
  console.log('');

  // Step 1: Write MCP configs
  console.log('  Setting up MCP configs...');
  let configured = 0;
  for (const target of MCP_TARGETS) {
    const filePath = target.path(projectDir);
    // Always configure Claude Code; others only if their dir exists
    if (target.name === 'Claude Code' || existsSync(dirname(filePath))) {
      if (writeMcpConfig(filePath, target.name)) configured++;
    }
  }

  console.log('');

  // Step 2: Append rules to all coding tool config files
  console.log('  Setting up auto-trigger rules...');
  for (const ruleFile of RULE_FILES) {
    const filePath = ruleFile.path(projectDir);
    // Always write CLAUDE.md; others only if they already exist OR their tool's MCP was configured
    if (ruleFile.name === 'CLAUDE.md' || existsSync(filePath)) {
      appendRulesToFile(filePath, ruleFile.name);
    } else if (ruleFile.name === '.cursorrules' && existsSync(join(projectDir, '.cursor'))) {
      appendRulesToFile(filePath, ruleFile.name);
    } else if (ruleFile.name === '.windsurfrules' && existsSync(join(projectDir, '.windsurf'))) {
      appendRulesToFile(filePath, ruleFile.name);
    }
  }

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
