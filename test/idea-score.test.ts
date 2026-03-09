import { describe, it, expect } from 'vitest';
import { buildIdeaScorePrompt } from '../src/prompts/idea-score.js';
import type { ProjectContext } from '../src/types.js';

const mockContext: ProjectContext = {
  cwd: '/test/project',
  name: 'test-app',
  fileTree: 'src/\n  index.ts\n  app.ts\npackage.json',
  packageJson: {
    name: 'test-app',
    dependencies: { express: '^4.18.0' },
    devDependencies: { vitest: '^1.0.0' },
  },
  readme: '# Test App\nA marketplace for handmade goods.',
  claudeMd: null,
  techStack: ['Express', 'Vitest', 'TypeScript'],
  stats: { totalFiles: 20, testFiles: 4, codeLines: 1500 },
};

describe('buildIdeaScorePrompt', () => {
  it('includes all 10 dimension names', () => {
    const result = buildIdeaScorePrompt(mockContext);
    expect(result).toContain('Market Size');
    expect(result).toContain('Technical Feasibility');
    expect(result).toContain('Competitive Moat');
    expect(result).toContain('Revenue Potential');
    expect(result).toContain('Time to Market');
    expect(result).toContain('User Validation');
    expect(result).toContain('Resource Efficiency');
    expect(result).toContain('Scalability');
    expect(result).toContain('Founder Fit');
    expect(result).toContain('Risk/Reward');
  });

  it('includes all verdict options', () => {
    const result = buildIdeaScorePrompt(mockContext);
    expect(result).toContain('CONTINUE');
    expect(result).toContain('SIMPLIFY');
    expect(result).toContain('PAUSE');
    expect(result).toContain('DELETE');
  });

  it('includes skeptical stance', () => {
    const result = buildIdeaScorePrompt(mockContext);
    expect(result).toContain('ruthless evaluator');
    expect(result).toContain('default stance is skeptical');
  });

  it('includes project context', () => {
    const result = buildIdeaScorePrompt(mockContext);
    expect(result).toContain('test-app');
    expect(result).toContain('Express');
    expect(result).toContain('1500');
  });

  it('includes idea_description when provided', () => {
    const result = buildIdeaScorePrompt(mockContext, 'An AI-powered marketplace for handmade crafts');
    expect(result).toContain('An AI-powered marketplace for handmade crafts');
    expect(result).toContain('Idea Description');
  });

  it('infers idea when no description provided', () => {
    const result = buildIdeaScorePrompt(mockContext);
    expect(result).toContain('Infer the idea from the README');
  });
});
