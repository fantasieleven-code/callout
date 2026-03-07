import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { detectScenes, buildRecommendPrompt, getSceneLabel } from '../src/prompts/recommend.js';
import { loadDismissed, dismissScene, filterDismissed } from '../src/recommend.js';
import type { ProjectContext } from '../src/types.js';

const TEST_DIR = '/tmp/callout-recommend-test';

function makeContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    cwd: TEST_DIR,
    name: 'test-project',
    fileTree: '',
    packageJson: { name: 'test-project', dependencies: {}, devDependencies: {} },
    readme: null,
    claudeMd: null,
    techStack: ['Node.js', 'TypeScript'],
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

describe('recommend - scene detection', () => {
  it('detects auth scene from task keywords', () => {
    const ctx = makeContext();
    const scenes = detectScenes(ctx, 'add user login and signup');
    expect(scenes).toContain('auth');
  });

  it('detects database scene from dependencies', () => {
    const ctx = makeContext({
      packageJson: { name: 'test', dependencies: { prisma: '^5.0.0' } },
    });
    const scenes = detectScenes(ctx);
    expect(scenes).toContain('database');
  });

  it('detects multiple scenes simultaneously', () => {
    const ctx = makeContext({
      packageJson: { name: 'test', dependencies: { stripe: '^14.0.0', prisma: '^5.0.0' } },
    });
    const scenes = detectScenes(ctx, 'add payment processing');
    expect(scenes).toContain('payments');
    expect(scenes).toContain('database');
  });

  it('returns empty array when no scenes match', () => {
    const ctx = makeContext();
    const scenes = detectScenes(ctx);
    expect(scenes).toEqual([]);
  });

  it('detects scene from task keyword case-insensitively', () => {
    const ctx = makeContext();
    const scenes = detectScenes(ctx, 'Set up CI/CD pipeline');
    expect(scenes).toContain('ci-cd');
  });
});

describe('recommend - dismissed tracking', () => {
  it('returns empty dismissed list for new project', () => {
    const data = loadDismissed(TEST_DIR);
    expect(data.dismissed).toEqual([]);
  });

  it('dismisses a scene and persists it', () => {
    dismissScene(TEST_DIR, 'auth');
    const data = loadDismissed(TEST_DIR);
    expect(data.dismissed).toContain('auth');
  });

  it('does not duplicate dismissed scenes', () => {
    dismissScene(TEST_DIR, 'auth');
    dismissScene(TEST_DIR, 'auth');
    const data = loadDismissed(TEST_DIR);
    expect(data.dismissed.filter((s) => s === 'auth')).toHaveLength(1);
  });

  it('filters out dismissed scenes', () => {
    dismissScene(TEST_DIR, 'auth');
    dismissScene(TEST_DIR, 'payments');
    const remaining = filterDismissed(TEST_DIR, ['auth', 'database', 'payments']);
    expect(remaining).toEqual(['database']);
  });
});

describe('recommend - prompt builder', () => {
  it('builds prompt with detected scenes and project context', () => {
    const ctx = makeContext();
    const prompt = buildRecommendPrompt(ctx, ['auth', 'database'], 'add user login');
    expect(prompt).toContain('Authentication / Authorization');
    expect(prompt).toContain('Database / ORM');
    expect(prompt).toContain('add user login');
    expect(prompt).toContain('test-project');
    expect(prompt).toContain('install command');
  });

  it('includes dependency info in prompt', () => {
    const ctx = makeContext({
      packageJson: { name: 'test', dependencies: { express: '^4.0.0' } },
    });
    const prompt = buildRecommendPrompt(ctx, ['api']);
    expect(prompt).toContain('express');
  });
});

describe('recommend - scene labels', () => {
  it('returns human-readable labels', () => {
    expect(getSceneLabel('auth')).toBe('Authentication / Authorization');
    expect(getSceneLabel('payments')).toBe('Payments / Billing');
    expect(getSceneLabel('ci-cd')).toBe('CI/CD');
  });
});
