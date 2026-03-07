import { describe, it, expect } from 'vitest';
import { buildValidatePrompt } from '../src/prompts/validate.js';
import type { ProjectContext } from '../src/types.js';

const earlyCtx: ProjectContext = {
  cwd: '/test/project',
  name: 'my-app',
  fileTree: 'src/\n  index.ts',
  packageJson: { name: 'my-app', dependencies: {} },
  readme: null,
  claudeMd: null,
  techStack: ['Next.js', 'TypeScript'],
  stats: { totalFiles: 10, testFiles: 0, codeLines: 300 },
};

const matureCtx: ProjectContext = {
  ...earlyCtx,
  stats: { totalFiles: 150, testFiles: 30, codeLines: 8000 },
};

describe('buildValidatePrompt', () => {
  it('includes the question in the prompt', () => {
    const question = 'Should I use Supabase or Planetscale?';
    const result = buildValidatePrompt(question, earlyCtx);
    expect(result).toContain(question);
  });

  it('includes project context', () => {
    const result = buildValidatePrompt('Use Redis?', earlyCtx);
    expect(result).toContain('my-app');
    expect(result).toContain('Next.js');
  });

  it('labels early project as prototype', () => {
    const result = buildValidatePrompt('Use Redis?', earlyCtx);
    expect(result).toContain('prototype');
  });

  it('labels mature project differently', () => {
    const result = buildValidatePrompt('Use Redis?', matureCtx);
    expect(result).toContain('established codebase');
  });

  it('requires a direct verdict in output', () => {
    const result = buildValidatePrompt('Use Redis?', earlyCtx);
    expect(result).toContain('Verdict');
    expect(result).toContain('Confidence');
  });

  it('asks for opinionated answer not trade-off list', () => {
    const result = buildValidatePrompt('Use Redis?', earlyCtx);
    expect(result).toContain('opinionated');
    expect(result).toContain('Make a call');
  });
});
