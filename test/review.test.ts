import { describe, it, expect } from 'vitest';
import { buildReviewPrompt } from '../src/review.js';
import type { ProjectContext } from '../src/types.js';

const mockContext: ProjectContext = {
  cwd: '/test/project',
  name: 'test-app',
  fileTree: 'src/\n  index.ts\n  app.ts\npackage.json',
  packageJson: {
    name: 'test-app',
    dependencies: { express: '^4.18.0', prisma: '^5.0.0' },
    devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' },
  },
  readme: '# Test App\nA test application.',
  claudeMd: null,
  techStack: ['Express', 'Prisma', 'Vitest', 'TypeScript'],
  stats: { totalFiles: 42, testFiles: 8, codeLines: 3500 },
};

describe('buildReviewPrompt', () => {
  it('includes all 6 perspectives by default', () => {
    const result = buildReviewPrompt(mockContext);
    expect(result).toContain('CTO / Technical Leadership Review');
    expect(result).toContain('Security Expert Review');
    expect(result).toContain('Product / Business Expert Review');
    expect(result).toContain('DevOps / Infrastructure Expert Review');
    expect(result).toContain('Target Customer Review');
    expect(result).toContain('Strategy / Business Leadership Review');
  });

  it('filters to selected perspectives', () => {
    const result = buildReviewPrompt(mockContext, ['cto', 'security']);
    expect(result).toContain('CTO / Technical Leadership Review');
    expect(result).toContain('Security Expert Review');
    expect(result).not.toContain('Product / Business Expert Review');
    expect(result).not.toContain('DevOps / Infrastructure Expert Review');
    expect(result).not.toContain('Target Customer Review');
    expect(result).not.toContain('Strategy / Business Leadership Review');
  });

  it('includes project metadata in header', () => {
    const result = buildReviewPrompt(mockContext);
    expect(result).toContain('Architecture Review: test-app');
    expect(result).toContain('Express, Prisma, Vitest, TypeScript');
    expect(result).toContain('Files**: 42');
    expect(result).toContain('Tests**: 8');
  });

  it('includes output format instructions', () => {
    const result = buildReviewPrompt(mockContext);
    expect(result).toContain('MUST FIX');
    expect(result).toContain('SHOULD FIX');
    expect(result).toContain('GOOD');
  });

  it('passes customer_role to customer perspective', () => {
    const result = buildReviewPrompt(mockContext, ['customer'], 'a startup CTO evaluating CI tools');
    expect(result).toContain('a startup CTO evaluating CI tools');
  });

  it('includes file tree in prompts', () => {
    const result = buildReviewPrompt(mockContext, ['cto']);
    expect(result).toContain('src/');
    expect(result).toContain('index.ts');
  });

  it('includes dependencies in CTO prompt', () => {
    const result = buildReviewPrompt(mockContext, ['cto']);
    expect(result).toContain('express');
    expect(result).toContain('prisma');
  });

  it('includes Executive Summary section', () => {
    const result = buildReviewPrompt(mockContext);
    expect(result).toContain('Executive Summary');
    expect(result).toContain('Most important finding');
    expect(result).toContain('generate this FIRST');
  });

  it('includes focus area when provided', () => {
    const result = buildReviewPrompt(mockContext, ['cto', 'security'], undefined, 'user login page');
    expect(result).toContain('Focused Review');
    expect(result).toContain('user login page');
    expect(result).toContain('focus your review specifically');
    // Still includes full project context
    expect(result).toContain('Express, Prisma, Vitest, TypeScript');
    expect(result).toContain('Files**: 42');
  });

  it('uses Architecture Review title when no focus', () => {
    const result = buildReviewPrompt(mockContext);
    expect(result).toContain('Architecture Review: test-app');
    expect(result).not.toContain('Focused Review');
  });
});
