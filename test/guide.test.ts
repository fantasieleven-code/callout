import { describe, it, expect } from 'vitest';
import { detectStage, buildGuidePrompt } from '../src/guide.js';
import type { ProjectContext } from '../src/types.js';

function makeContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    cwd: '/test',
    name: 'test-app',
    fileTree: '',
    packageJson: null,
    readme: null,
    claudeMd: null,
    techStack: [],
    stats: { totalFiles: 0, testFiles: 0, codeLines: 0 },
    ...overrides,
  };
}

describe('detectStage', () => {
  it('detects research stage (no code)', () => {
    expect(detectStage(makeContext())).toBe('research');
  });

  it('detects architecture stage (few files)', () => {
    expect(detectStage(makeContext({
      packageJson: { name: 'app' },
      stats: { totalFiles: 5, testFiles: 0, codeLines: 200 },
    }))).toBe('architecture');
  });

  it('detects building stage (no tests)', () => {
    expect(detectStage(makeContext({
      packageJson: { name: 'app' },
      stats: { totalFiles: 30, testFiles: 0, codeLines: 3000 },
    }))).toBe('building');
  });

  it('detects testing stage (has tests, no deployment)', () => {
    expect(detectStage(makeContext({
      packageJson: { name: 'app' },
      stats: { totalFiles: 30, testFiles: 5, codeLines: 3000 },
    }))).toBe('testing');
  });

  it('detects launch stage (has deployment config)', () => {
    expect(detectStage(makeContext({
      packageJson: { name: 'app' },
      fileTree: 'src/\nDockerfile\nlanding/\n.github/workflows/',
      stats: { totalFiles: 50, testFiles: 10, codeLines: 5000 },
    }))).toBe('launch');
  });
});

describe('buildGuidePrompt', () => {
  it('includes detected stage', () => {
    const result = buildGuidePrompt(makeContext());
    expect(result).toContain('Research & Direction');
  });

  it('includes numbered questions', () => {
    const result = buildGuidePrompt(makeContext());
    expect(result).toContain('### 1.');
    expect(result).toContain('### 2.');
  });

  it('includes perspective sources', () => {
    const result = buildGuidePrompt(makeContext());
    expect(result).toContain('Source: Product perspective');
  });

  it('includes todo integration instruction', () => {
    const result = buildGuidePrompt(makeContext());
    expect(result).toContain('todo_add');
  });

  it('shows different questions for building stage', () => {
    const research = buildGuidePrompt(makeContext());
    const building = buildGuidePrompt(makeContext({
      packageJson: { name: 'app' },
      stats: { totalFiles: 30, testFiles: 0, codeLines: 3000 },
    }));
    expect(research).toContain('target user');
    expect(building).toContain('0 tests');
  });
});
