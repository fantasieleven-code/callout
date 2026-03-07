import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { loadConfig, saveConfig, inferTargetUser, getTargetUser } from '../src/config.js';
import type { ProjectContext } from '../src/types.js';

const TEST_DIR = '/tmp/callout-config-test';

function makeContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    cwd: TEST_DIR,
    name: 'test-project',
    fileTree: '',
    packageJson: { name: 'test-project', dependencies: {} },
    readme: null,
    claudeMd: null,
    techStack: ['Node.js'],
    stats: { totalFiles: 10, testFiles: 2, codeLines: 500 },
    ...overrides,
  };
}

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe('config', () => {
  it('returns empty config for new project', () => {
    const config = loadConfig(TEST_DIR);
    expect(config).toEqual({});
  });

  it('saves and loads target_user', () => {
    saveConfig(TEST_DIR, { target_user: 'non-technical founder' });
    const config = loadConfig(TEST_DIR);
    expect(config.target_user).toBe('non-technical founder');
  });

  it('merges with existing config', () => {
    saveConfig(TEST_DIR, { target_user: 'original user' });
    saveConfig(TEST_DIR, { target_user: 'updated user' });
    const config = loadConfig(TEST_DIR);
    expect(config.target_user).toBe('updated user');
  });
});

describe('inferTargetUser', () => {
  it('infers target user from README "for X" pattern', () => {
    const ctx = makeContext({
      readme: '# MyApp\nA project management tool for small business owners.',
    });
    const user = inferTargetUser(ctx);
    expect(user).toContain('small business owners');
  });

  it('infers target user from Chinese patterns', () => {
    const ctx = makeContext({
      claudeMd: '目标用户: 用AI代替工程团队的非技术创始人',
    });
    const user = inferTargetUser(ctx);
    expect(user).toBeTruthy();
  });

  it('returns undefined when no clear signal', () => {
    const ctx = makeContext({ readme: '# MyApp\nSome code.' });
    const user = inferTargetUser(ctx);
    expect(user).toBeUndefined();
  });

  it('filters out generic targets like "everyone"', () => {
    const ctx = makeContext({
      readme: 'Built for everyone.',
    });
    const user = inferTargetUser(ctx);
    expect(user).toBeUndefined();
  });
});

describe('getTargetUser', () => {
  it('returns persisted config first', () => {
    saveConfig(TEST_DIR, { target_user: 'enterprise CTO' });
    const ctx = makeContext({
      readme: 'Built for indie developers.',
    });
    const user = getTargetUser(TEST_DIR, ctx);
    expect(user).toBe('enterprise CTO');
  });

  it('infers and persists when no config exists', () => {
    const ctx = makeContext({
      readme: 'An invoicing tool designed for freelance designers.',
    });
    const user = getTargetUser(TEST_DIR, ctx);
    expect(user).toContain('freelance designers');
    // Should be persisted now
    const config = loadConfig(TEST_DIR);
    expect(config.target_user).toContain('freelance designers');
  });

  it('returns undefined when nothing found', () => {
    const ctx = makeContext();
    const user = getTargetUser(TEST_DIR, ctx);
    expect(user).toBeUndefined();
  });
});
