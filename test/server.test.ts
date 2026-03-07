import { describe, it, expect } from 'vitest';
import { server } from '../src/server.js';

// Accessing MCP SDK internals — tested with @modelcontextprotocol/sdk ^1.12.1
// _registeredTools: plain object keyed by tool name (not a Map)
// server.server._serverInfo: { name, version } set during McpServer construction
// If these break after an SDK upgrade, check the McpServer class internals
const registeredTools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
const innerServer = (server as unknown as { server: { _serverInfo: { name: string; version: string } } }).server;

const EXPECTED_TOOLS = [
  // Analysis tools (7)
  'review',
  'challenge',
  'guide',
  'spot_check',
  'test_translate',
  'cleanup',
  'validate',
  // Todo tools (4)
  'todo_add',
  'todo_update',
  'todo_list',
  'todo_summary',
  // Recommend tools (3)
  'recommend',
  'recommend_dismiss',
  'recommend_reset',
  // Meta tools (4)
  'init',
  'callout_help',
  'save_review_findings',
  'set_target_user',
];

describe('MCP Server integration', () => {
  it('should have exactly 18 tools registered', () => {
    expect(Object.keys(registeredTools).length).toBe(18);
  });

  it.each(EXPECTED_TOOLS)('should have tool: %s', (toolName) => {
    expect(toolName in registeredTools).toBe(true);
  });

  it('should have correct server name', () => {
    expect(innerServer._serverInfo.name).toBe('callout');
  });

  it('should have a version string', () => {
    expect(innerServer._serverInfo.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should have instructions set for auto-trigger without init', () => {
    const instructions = (innerServer as unknown as { _instructions?: string })._instructions;
    expect(instructions).toBeDefined();
    expect(instructions).toContain('project_path');
    expect(instructions).toContain('Multi-Perspective');
    expect(instructions).toContain('Auto-Plan');
    expect(instructions).toContain('callout_help');
  });

  it('should not start transport when imported (isMainModule guard)', () => {
    // If we got here without hanging, the guard works
    expect(true).toBe(true);
  });
});
