import { describe, it, expect } from 'vitest';
import { buildChallengePrompt } from '../src/challenge.js';
import type { ProjectContext } from '../src/types.js';

const mockContext: ProjectContext = {
  cwd: '/test/project',
  name: 'test-app',
  fileTree: 'src/\n  index.ts\npackage.json',
  packageJson: { name: 'test-app', dependencies: { express: '^4.18.0' } },
  readme: '# Test App',
  claudeMd: '## Decisions\n- Use Express for API',
  techStack: ['Express', 'TypeScript'],
  stats: { totalFiles: 20, testFiles: 5, codeLines: 1500 },
};

describe('buildChallengePrompt', () => {
  it('includes git diff in output', () => {
    const result = buildChallengePrompt(mockContext, '+added line\n-removed line', '', undefined);
    expect(result).toContain('+added line');
    expect(result).toContain('-removed line');
  });

  it('includes recent files', () => {
    const result = buildChallengePrompt(mockContext, '', 'abc1234 fix bug\nsrc/app.ts', undefined);
    expect(result).toContain('src/app.ts');
  });

  it('includes developer description when provided', () => {
    const result = buildChallengePrompt(mockContext, '', '', 'Adding voice RTC support');
    expect(result).toContain('Adding voice RTC support');
    expect(result).toContain("Developer's description");
  });

  it('includes all 5 challenge sections', () => {
    const result = buildChallengePrompt(mockContext, '', '', undefined);
    expect(result).toContain('ROI Check');
    expect(result).toContain('Sunk Cost Detection');
    expect(result).toContain('Complexity Budget');
    expect(result).toContain('Scope Creep Alert');
    expect(result).toContain('Verdict');
  });

  it('includes 4 verdict options', () => {
    const result = buildChallengePrompt(mockContext, '', '', undefined);
    expect(result).toContain('CONTINUE');
    expect(result).toContain('SIMPLIFY');
    expect(result).toContain('PAUSE');
    expect(result).toContain('DELETE');
  });

  it('includes CLAUDE.md content for decision context', () => {
    const result = buildChallengePrompt(mockContext, '', '', undefined);
    expect(result).toContain('Use Express for API');
  });

  it('handles missing diff gracefully', () => {
    const result = buildChallengePrompt(mockContext, '', '', undefined);
    expect(result).toContain('no changes detected');
  });
});
