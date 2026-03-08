import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { scanProjects, buildPortfolioPrompt } from '../src/portfolio.js';

const TEST_ROOT = '/tmp/callout-portfolio-test';

function setupProject(name: string, options?: {
  callout?: boolean;
  todos?: { priority: string; status: string }[];
  reviews?: { date: string; findingSummary?: string }[];
  packageJson?: Record<string, unknown>;
  readme?: string;
}) {
  const dir = join(TEST_ROOT, name);
  mkdirSync(dir, { recursive: true });

  if (options?.packageJson) {
    writeFileSync(join(dir, 'package.json'), JSON.stringify(options.packageJson));
  }

  if (options?.readme) {
    writeFileSync(join(dir, 'README.md'), options.readme);
  }

  if (options?.callout) {
    const calloutDir = join(dir, '.callout');
    mkdirSync(calloutDir, { recursive: true });

    if (options?.todos) {
      const todoData = {
        nextId: options.todos.length + 1,
        items: options.todos.map((t, i) => ({
          id: i + 1,
          title: `Todo ${i + 1}`,
          description: '',
          priority: t.priority,
          status: t.status,
          source: 'test',
          createdAt: '2026-03-08',
          updatedAt: '2026-03-08',
        })),
      };
      writeFileSync(join(calloutDir, 'todo.json'), JSON.stringify(todoData));
    }

    if (options?.reviews) {
      writeFileSync(join(calloutDir, 'history.json'), JSON.stringify({ reviews: options.reviews }));
    }
  }
}

describe('scanProjects', () => {
  beforeEach(() => mkdirSync(TEST_ROOT, { recursive: true }));
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  it('finds projects with .callout/', () => {
    setupProject('project-a', { callout: true, packageJson: { name: 'a' } });
    const results = scanProjects(TEST_ROOT);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('project-a');
    expect(results[0].hasCallout).toBe(true);
  });

  it('finds projects with package.json only', () => {
    setupProject('project-b', { packageJson: { name: 'b', description: 'Test project' } });
    const results = scanProjects(TEST_ROOT);
    expect(results.length).toBe(1);
    expect(results[0].hasCallout).toBe(false);
    expect(results[0].description).toBe('Test project');
  });

  it('skips non-project directories', () => {
    mkdirSync(join(TEST_ROOT, 'random-dir'), { recursive: true });
    const results = scanProjects(TEST_ROOT);
    expect(results.length).toBe(0);
  });

  it('counts todos correctly', () => {
    setupProject('project-c', {
      callout: true,
      packageJson: { name: 'c' },
      todos: [
        { priority: 'must', status: 'open' },
        { priority: 'must', status: 'open' },
        { priority: 'should', status: 'open' },
        { priority: 'nice', status: 'done' },
        { priority: 'should', status: 'in_progress' },
      ],
    });
    const results = scanProjects(TEST_ROOT);
    expect(results[0].todoMust).toBe(2);
    expect(results[0].todoOpen).toBe(3);
    expect(results[0].todoInProgress).toBe(1);
    expect(results[0].todoDone).toBe(1);
  });

  it('reads review history', () => {
    setupProject('project-d', {
      callout: true,
      packageJson: { name: 'd' },
      reviews: [
        { date: '2026-03-07', findingSummary: '3 MUST FIX, 5 SHOULD FIX' },
      ],
    });
    const results = scanProjects(TEST_ROOT);
    expect(results[0].lastReviewDate).toBe('2026-03-07');
    expect(results[0].lastReviewSummary).toBe('3 MUST FIX, 5 SHOULD FIX');
  });

  it('sorts MUST FIX projects first', () => {
    setupProject('healthy', { callout: true, packageJson: { name: 'healthy' } });
    setupProject('risky', {
      callout: true,
      packageJson: { name: 'risky' },
      todos: [{ priority: 'must', status: 'open' }],
    });
    const results = scanProjects(TEST_ROOT);
    expect(results[0].name).toBe('risky');
    expect(results[1].name).toBe('healthy');
  });

  it('reads description from README', () => {
    setupProject('with-readme', {
      packageJson: { name: 'with-readme' },
      readme: '# My Project\n\nThis is a great project for testing.',
    });
    const results = scanProjects(TEST_ROOT);
    expect(results[0].description).toBe('This is a great project for testing.');
  });

  it('returns empty for nonexistent directory', () => {
    const results = scanProjects('/tmp/nonexistent-callout-dir');
    expect(results.length).toBe(0);
  });
});

describe('buildPortfolioPrompt', () => {
  it('returns message for empty projects', () => {
    const prompt = buildPortfolioPrompt([]);
    expect(prompt).toContain('No projects found');
  });

  it('includes project count in header', () => {
    const prompt = buildPortfolioPrompt([{
      name: 'test', path: '/test', hasCallout: true,
      techStack: [], todoOpen: 0, todoMust: 0, todoInProgress: 0, todoDone: 0,
      lastReviewDate: null, lastReviewSummary: null, description: null,
    }]);
    expect(prompt).toContain('1 projects');
  });

  it('highlights MUST FIX projects', () => {
    const prompt = buildPortfolioPrompt([{
      name: 'risky', path: '/risky', hasCallout: true,
      techStack: ['React'], todoOpen: 3, todoMust: 2, todoInProgress: 0, todoDone: 1,
      lastReviewDate: '2026-03-07', lastReviewSummary: '2 MUST FIX', description: 'A risky project',
    }]);
    expect(prompt).toContain('[!!]');
    expect(prompt).toContain('MUST FIX: 2');
  });

  it('includes action required section', () => {
    const prompt = buildPortfolioPrompt([{
      name: 'test', path: '/test', hasCallout: false,
      techStack: [], todoOpen: 0, todoMust: 0, todoInProgress: 0, todoDone: 0,
      lastReviewDate: null, lastReviewSummary: null, description: null,
    }]);
    expect(prompt).toContain('Action Required');
    expect(prompt).toContain('business priority');
  });
});
