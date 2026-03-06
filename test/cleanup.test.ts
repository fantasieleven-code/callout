import { describe, it, expect } from 'vitest';
import { buildCleanupPrompt } from '../src/prompts/cleanup.js';
import type { ProjectContext } from '../src/types.js';

const mockContext: ProjectContext = {
  cwd: '/test/project',
  name: 'my-app',
  fileTree: 'src/\n  index.ts\n  utils.ts\n  utils-old.ts\npackage.json',
  packageJson: {
    name: 'my-app',
    dependencies: { express: '^4.18.0', lodash: '^4.17.21' },
    devDependencies: { vitest: '^1.0.0' },
  },
  readme: null,
  claudeMd: null,
  techStack: ['Express', 'TypeScript'],
  stats: { totalFiles: 30, testFiles: 4, codeLines: 1200 },
};

describe('buildCleanupPrompt', () => {
  it('includes file tree in prompt', () => {
    const result = buildCleanupPrompt(mockContext);
    expect(result).toContain('utils-old.ts');
    expect(result).toContain('src/');
  });

  it('includes dependencies', () => {
    const result = buildCleanupPrompt(mockContext);
    expect(result).toContain('lodash');
    expect(result).toContain('express');
  });

  it('covers dead code category', () => {
    const result = buildCleanupPrompt(mockContext);
    expect(result).toContain('Dead Code');
  });

  it('covers duplicate code category', () => {
    const result = buildCleanupPrompt(mockContext);
    expect(result).toContain('Duplicate');
  });

  it('covers unused dependencies category', () => {
    const result = buildCleanupPrompt(mockContext);
    expect(result).toContain('Unused Dependencies');
  });

  it('asks for specific actions not vague suggestions', () => {
    const result = buildCleanupPrompt(mockContext);
    expect(result).toContain('exact action');
    expect(result).toContain('Start here');
  });
});
