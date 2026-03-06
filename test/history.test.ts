import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadHistory, saveReview, buildHistoryContext } from '../src/history.js';

const TEST_DIR = '/tmp/callout-history-test';

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe('history', () => {
  it('returns empty history for new project', () => {
    const history = loadHistory(TEST_DIR);
    expect(history.reviews).toEqual([]);
  });

  it('saves and loads a review', () => {
    saveReview(TEST_DIR, {
      date: '2026-03-06',
      perspectives: ['cto', 'security'],
      findingSummary: '3 MUST FIX, 2 SHOULD FIX',
    });

    const history = loadHistory(TEST_DIR);
    expect(history.reviews).toHaveLength(1);
    expect(history.reviews[0].date).toBe('2026-03-06');
    expect(history.reviews[0].findingSummary).toBe('3 MUST FIX, 2 SHOULD FIX');
  });

  it('creates .callout directory', () => {
    saveReview(TEST_DIR, {
      date: '2026-03-06',
      perspectives: ['cto'],
      findingSummary: 'test',
    });

    expect(existsSync(join(TEST_DIR, '.callout', 'history.json'))).toBe(true);
  });

  it('builds history context for comparison', () => {
    saveReview(TEST_DIR, {
      date: '2026-03-05',
      perspectives: ['cto'],
      findingSummary: '2 MUST FIX: role system, JWT',
    });
    saveReview(TEST_DIR, {
      date: '2026-03-06',
      perspectives: ['cto', 'security'],
      findingSummary: '1 MUST FIX: JWT (role system fixed)',
    });

    const context = buildHistoryContext(TEST_DIR);
    expect(context).toContain('Previous Review History');
    expect(context).toContain('2026-03-05');
    expect(context).toContain('2026-03-06');
    expect(context).toContain('still unresolved');
    expect(context).toContain('have been fixed');
  });

  it('returns empty string when no history', () => {
    const context = buildHistoryContext(TEST_DIR);
    expect(context).toBe('');
  });

  it('keeps only last 50 reviews', () => {
    for (let i = 0; i < 55; i++) {
      saveReview(TEST_DIR, {
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        perspectives: ['cto'],
        findingSummary: `review ${i}`,
      });
    }

    const history = loadHistory(TEST_DIR);
    expect(history.reviews).toHaveLength(50);
    expect(history.reviews[0].findingSummary).toBe('review 5');
  });
});
