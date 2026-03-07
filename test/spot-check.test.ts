import { describe, it, expect } from 'vitest';
import { buildSpotCheckPrompt } from '../src/prompts/spot-check.js';

describe('buildSpotCheckPrompt', () => {
  it('includes the code in the prompt', () => {
    const code = 'const query = `SELECT * FROM users WHERE id = ${userId}`;';
    const result = buildSpotCheckPrompt(code);
    expect(result).toContain(code);
  });

  it('includes filename when provided', () => {
    const result = buildSpotCheckPrompt('const x = 1;', 'auth.ts');
    expect(result).toContain('auth.ts');
  });

  it('shows fallback when no filename', () => {
    const result = buildSpotCheckPrompt('const x = 1;');
    expect(result).toContain('no filename provided');
  });

  it('instructs to only flag dangerous issues', () => {
    const result = buildSpotCheckPrompt('const x = 1;');
    expect(result).toContain('dangerous issues only');
    expect(result).toContain('CRITICAL');
    expect(result).toContain('HIGH');
    expect(result).toContain('MEDIUM');
  });

  it('instructs to skip style and performance', () => {
    const result = buildSpotCheckPrompt('const x = 1;');
    expect(result).toContain('Skip style');
  });

  it('includes "no issues found" path in output format', () => {
    const result = buildSpotCheckPrompt('const x = 1;');
    expect(result).toContain('No dangerous issues found');
  });
});
