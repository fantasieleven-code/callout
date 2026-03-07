import { describe, it, expect } from 'vitest';
import { buildTestTranslatePrompt } from '../src/prompts/test-translate.js';
import type { ProjectContext } from '../src/types.js';

const mockContext: ProjectContext = {
  cwd: '/test/project',
  name: 'my-app',
  fileTree: 'src/\n  index.ts\ntest/\n  index.test.ts',
  packageJson: { name: 'my-app', dependencies: { express: '^4.18.0' } },
  readme: null,
  claudeMd: null,
  techStack: ['Express', 'TypeScript'],
  stats: { totalFiles: 20, testFiles: 5, codeLines: 800 },
};

const sampleTestOutput = `
 ✓ test/auth.test.ts (3 tests)
 ✓ test/api.test.ts (5 tests)
 ✗ test/payment.test.ts (1 test failed)
   FAIL: processPayment should handle declined cards

Test Files  2 passed, 1 failed
Tests       8 passed, 1 failed
`;

describe('buildTestTranslatePrompt', () => {
  it('includes test output in prompt', () => {
    const result = buildTestTranslatePrompt(sampleTestOutput, mockContext);
    expect(result).toContain('processPayment');
    expect(result).toContain('payment.test.ts');
  });

  it('includes project name and stack', () => {
    const result = buildTestTranslatePrompt(sampleTestOutput, mockContext);
    expect(result).toContain('my-app');
    expect(result).toContain('Express');
  });

  it('asks for plain language translation', () => {
    const result = buildTestTranslatePrompt(sampleTestOutput, mockContext);
    expect(result).toContain('plain language');
  });

  it('requests 15-minute manual test script', () => {
    const result = buildTestTranslatePrompt(sampleTestOutput, mockContext);
    expect(result).toContain('15-minute');
  });

  it('asks to distinguish automated vs manual coverage', () => {
    const result = buildTestTranslatePrompt(sampleTestOutput, mockContext);
    expect(result).toContain('manually');
    expect(result).toContain('automated');
  });
});
