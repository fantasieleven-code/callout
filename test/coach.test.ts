import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { collectCoachSignals, buildCoachPrompt } from '../src/coach.js';
import type { ProjectContext } from '../src/types.js';

const TEST_DIR = '/tmp/callout-coach-test';

const mockContext: ProjectContext = {
  cwd: TEST_DIR,
  name: 'test-app',
  fileTree: 'src/\n  index.ts\n  utils.ts\n  helpers.ts\npackage.json',
  packageJson: {
    name: 'test-app',
    dependencies: { express: '^4.18.0', prisma: '^5.0.0' },
    devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' },
    scripts: { test: 'vitest run', build: 'tsc', dev: 'tsc --watch' },
  },
  readme: '# Test App\nA test application.',
  claudeMd: null,
  techStack: ['Express', 'Prisma', 'TypeScript'],
  stats: { totalFiles: 42, testFiles: 8, codeLines: 3500 },
};

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify(mockContext.packageJson));
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('collectCoachSignals', () => {
  it('detects missing CLAUDE.md', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    expect(signals.hasClaudeMd).toBe(false);
  });

  it('detects existing CLAUDE.md', () => {
    writeFileSync(join(TEST_DIR, 'CLAUDE.md'), '# Project');
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    expect(signals.hasClaudeMd).toBe(true);
  });

  it('detects TypeScript when tsconfig.json exists', () => {
    writeFileSync(join(TEST_DIR, 'tsconfig.json'), '{}');
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    expect(signals.hasTypeScript).toBe(true);
  });

  it('detects linter when eslint config exists', () => {
    writeFileSync(join(TEST_DIR, 'eslint.config.js'), '');
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    expect(signals.hasLinter).toBe(true);
  });

  it('detects vague file names from file tree', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    expect(signals.vagueFileNames).toContain('utils.ts');
    expect(signals.vagueFileNames).toContain('helpers.ts');
  });

  it('calculates test ratio', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    expect(signals.testRatio).toBeCloseTo(8 / 42);
  });

  it('detects scripts from package.json', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    expect(signals.hasTestScript).toBe(true);
    expect(signals.hasBuildScript).toBe(true);
  });
});

describe('buildCoachPrompt', () => {
  it('includes project name and stage', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, '', '', '', 0, null, 'building');
    expect(prompt).toContain('AI Collaboration Coach: test-app');
    expect(prompt).toContain('building');
  });

  it('includes environment signals', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, '', '', '', 0, null, 'building');
    expect(prompt).toContain('CLAUDE.md / .cursorrules: MISSING');
    expect(prompt).toContain('Module A: Environment Diagnosis');
  });

  it('includes behavior patterns section with git data', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, 'abc123 some commit\nfile.ts', 'abc123 some commit', '', 0, null, 'building');
    expect(prompt).toContain('Module B: Behavior Patterns');
    expect(prompt).toContain('abc123 some commit');
    expect(prompt).toContain('Hotspot files');
  });

  it('includes knowledge blind spots with dependencies', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, '', '', '', 0, null, 'building');
    expect(prompt).toContain('Module C: Knowledge Blind Spots');
    expect(prompt).toContain('express');
    expect(prompt).toContain('prisma');
    expect(prompt).toContain('AI-generated documentation summaries miss 30-50%');
  });

  it('includes review history info', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, '', '', '', 3, '2026-03-07', 'testing');
    expect(prompt).toContain('Reviews completed**: 3');
    expect(prompt).toContain('last: 2026-03-07');
  });

  it('includes todo summary when provided', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, '', '', '## Project Health: 5 total items', 0, null, 'building');
    expect(prompt).toContain('Todo Health');
    expect(prompt).toContain('5 total items');
  });

  it('includes output format instructions', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, '', '', '', 0, null, 'building');
    expect(prompt).toContain('[MUST]');
    expect(prompt).toContain('[SHOULD]');
    expect(prompt).toContain('todo_add');
  });

  it('detects unbound SDK dependencies', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    // prisma is in SDK_INDICATORS and not bound to any doc
    expect(signals.unboundSdks).toContain('prisma');
  });

  it('recommends Context7 and Firecrawl for unbound SDKs', () => {
    const signals = collectCoachSignals(TEST_DIR, mockContext);
    const prompt = buildCoachPrompt(mockContext, signals, '', '', '', 0, null, 'building');
    expect(prompt).toContain('Context7');
    expect(prompt).toContain('Firecrawl');
    expect(prompt).toContain('UNPROTECTED SDKs');
  });
});
