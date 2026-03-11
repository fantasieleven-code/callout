import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDocsTools } from '../src/handlers/docs.js';
import { registerDoc, saveComplianceScore } from '../src/docs.js';

const TEST_DIR = '/tmp/callout-docs-handler-test';

// Extract handler callbacks from registered tools
function getToolHandler(server: McpServer, toolName: string): Function {
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: Function }> })._registeredTools;
  return tools[toolName].handler;
}

let testServer: McpServer;
let docHandler: Function;
let docGateHandler: Function;
let renovationHandler: Function;

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });

  testServer = new McpServer({ name: 'test', version: '0.0.1' });
  registerDocsTools(testServer);
  docHandler = getToolHandler(testServer, 'doc');
  docGateHandler = getToolHandler(testServer, 'doc_gate');
  renovationHandler = getToolHandler(testServer, 'renovation');
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('doc handler error paths', () => {
  it('should error on register without domain', async () => {
    const result = await docHandler({ action: 'register', project_path: TEST_DIR });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('domain');
  });

  it('should error on register without docs/scope/rule', async () => {
    const result = await docHandler({ action: 'register', domain: 'test', project_path: TEST_DIR });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('docs');
  });

  it('should error on check without changed_files', async () => {
    const result = await docHandler({ action: 'check', project_path: TEST_DIR });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('changed_files');
  });

  it('should NOT save compliance score when action is list (action guard)', async () => {
    // Register a binding first
    registerDoc(TEST_DIR, 'test-domain', ['docs/test.md'], ['src/**'], 'test rule');

    // Call list with compliance params — should list, not save score
    const result = await docHandler({
      action: 'list',
      compliance_correct: 5,
      compliance_total: 10,
      project_path: TEST_DIR,
    });

    // Should return list output, not compliance save output
    expect(result.content[0].text).toContain('test-domain');
    expect(result.content[0].text).not.toContain('Compliance Score Saved');
  });

  it('should save compliance score when action is check', async () => {
    const result = await docHandler({
      action: 'check',
      domain: 'my-sdk',
      compliance_correct: 8,
      compliance_total: 10,
      project_path: TEST_DIR,
    });

    expect(result.content[0].text).toContain('Compliance Score Saved');
    expect(result.content[0].text).toContain('80%');
  });
});

describe('doc_gate handler', () => {
  it('should pass through when no bindings match', async () => {
    const result = await docGateHandler({ file_path: 'src/unprotected.ts', project_path: TEST_DIR });
    expect(result.content[0].text).toContain('Proceed freely');
  });

  it('should return gate prompt when binding matches', async () => {
    registerDoc(TEST_DIR, 'rtc', ['docs/rtc.md'], ['src/rtc/**'], 'Read RTC docs first');
    const result = await docGateHandler({ file_path: 'src/rtc/client.ts', project_path: TEST_DIR });
    expect(result.content[0].text).toContain('DOMAIN KNOWLEDGE GATE');
    expect(result.content[0].text).toContain('Read RTC docs first');
  });
});

describe('renovation handler error paths', () => {
  it('should error on start without domain', async () => {
    const result = await renovationHandler({ action: 'start', project_path: TEST_DIR });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('domain');
  });

  it('should error on save without renovation_id', async () => {
    const result = await renovationHandler({ action: 'save', project_path: TEST_DIR });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('renovation_id');
  });

  it('should error on save with non-existent renovation_id', async () => {
    const result = await renovationHandler({
      action: 'save',
      renovation_id: 999,
      status: 'completed',
      project_path: TEST_DIR,
    });
    expect(result.content[0].text).toContain('not found');
  });
});
