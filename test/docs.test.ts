import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadDocs,
  saveDocs,
  registerDoc,
  removeDoc,
  findBindingsForFile,
  matchGlob,
  loadRenovations,
  addRenovation,
  updateRenovation,
  formatDocsOverview,
  formatRenovationHistory,
  loadCompliance,
  saveComplianceScore,
  formatComplianceTrend,
  generateClaudeMdSnippet,
} from '../src/docs.js';

const TEST_DIR = '/tmp/callout-docs-test';

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('matchGlob', () => {
  it('should match simple wildcard', () => {
    expect(matchGlob('src/*.ts', 'src/index.ts')).toBe(true);
    expect(matchGlob('src/*.ts', 'src/deep/index.ts')).toBe(false);
  });

  it('should match double wildcard', () => {
    expect(matchGlob('src/**/*.ts', 'src/deep/nested/file.ts')).toBe(true);
    expect(matchGlob('src/rtc/**', 'src/rtc/client.ts')).toBe(true);
    expect(matchGlob('src/rtc/**', 'src/rtc/utils/helper.ts')).toBe(true);
  });

  it('should not match unrelated paths', () => {
    expect(matchGlob('src/rtc/**', 'src/auth/login.ts')).toBe(false);
    expect(matchGlob('src/*.ts', 'lib/index.ts')).toBe(false);
  });
});

describe('Doc bindings', () => {
  it('should load empty config from non-existent file', () => {
    const config = loadDocs(TEST_DIR);
    expect(config.bindings).toEqual([]);
  });

  it('should register and persist a binding', () => {
    const binding = registerDoc(
      TEST_DIR,
      'volcano-rtc',
      ['docs/volcano-av.md'],
      ['src/rtc/**'],
      'Must read Volcano docs before modifying RTC code',
    );

    expect(binding.domain).toBe('volcano-rtc');
    expect(binding.docs).toEqual(['docs/volcano-av.md']);

    // Verify persistence
    const loaded = loadDocs(TEST_DIR);
    expect(loaded.bindings.length).toBe(1);
    expect(loaded.bindings[0].domain).toBe('volcano-rtc');
  });

  it('should upsert existing domain', () => {
    registerDoc(TEST_DIR, 'stripe', ['docs/stripe-v1.md'], ['src/pay/**'], 'old rule');
    registerDoc(TEST_DIR, 'stripe', ['docs/stripe-v2.md'], ['src/payment/**'], 'new rule');

    const config = loadDocs(TEST_DIR);
    expect(config.bindings.length).toBe(1);
    expect(config.bindings[0].docs).toEqual(['docs/stripe-v2.md']);
    expect(config.bindings[0].rule).toBe('new rule');
  });

  it('should remove a binding', () => {
    registerDoc(TEST_DIR, 'a', ['d.md'], ['src/a/**'], 'rule a');
    registerDoc(TEST_DIR, 'b', ['d.md'], ['src/b/**'], 'rule b');

    expect(removeDoc(TEST_DIR, 'a')).toBe(true);
    expect(loadDocs(TEST_DIR).bindings.length).toBe(1);
    expect(removeDoc(TEST_DIR, 'nonexistent')).toBe(false);
  });

  it('should find bindings for a file path', () => {
    registerDoc(TEST_DIR, 'rtc', ['docs/rtc.md'], ['src/rtc/**'], 'rtc rule');
    registerDoc(TEST_DIR, 'auth', ['docs/auth.md'], ['src/auth/**'], 'auth rule');

    const rtcBindings = findBindingsForFile(TEST_DIR, 'src/rtc/client.ts');
    expect(rtcBindings.length).toBe(1);
    expect(rtcBindings[0].domain).toBe('rtc');

    const noBindings = findBindingsForFile(TEST_DIR, 'src/utils/helper.ts');
    expect(noBindings.length).toBe(0);
  });
});

describe('Renovations', () => {
  it('should load empty renovations from non-existent file', () => {
    const data = loadRenovations(TEST_DIR);
    expect(data.records).toEqual([]);
    expect(data.nextId).toBe(1);
  });

  it('should add and persist a renovation record', () => {
    const record = addRenovation(TEST_DIR, 'volcano-rtc', 1);
    expect(record.id).toBe(1);
    expect(record.domain).toBe('volcano-rtc');
    expect(record.status).toBe('in_progress');
    expect(record.batch).toBe(1);

    const loaded = loadRenovations(TEST_DIR);
    expect(loaded.records.length).toBe(1);
    expect(loaded.nextId).toBe(2);
  });

  it('should update a renovation record', () => {
    addRenovation(TEST_DIR, 'stripe', 1);
    const updated = updateRenovation(TEST_DIR, 1, {
      discoveries: ['Found batch API', 'Found webhook v2'],
      fixes: ['Changed field name X to Y'],
      status: 'completed',
    });

    expect(updated).not.toBeNull();
    expect(updated!.discoveries.length).toBe(2);
    expect(updated!.fixes.length).toBe(1);
    expect(updated!.status).toBe('completed');
  });

  it('should return null for non-existent renovation', () => {
    expect(updateRenovation(TEST_DIR, 999, { status: 'completed' })).toBeNull();
  });

  it('should auto-increment IDs', () => {
    addRenovation(TEST_DIR, 'a', 1);
    const second = addRenovation(TEST_DIR, 'b', 1);
    expect(second.id).toBe(2);
  });
});

describe('Formatting', () => {
  it('should format empty docs overview', () => {
    const output = formatDocsOverview(TEST_DIR);
    expect(output).toContain('No documentation bindings');
  });

  it('should format docs overview with bindings', () => {
    registerDoc(TEST_DIR, 'rtc', ['docs/rtc.md'], ['src/rtc/**'], 'Read docs first');
    const output = formatDocsOverview(TEST_DIR);
    expect(output).toContain('rtc');
    expect(output).toContain('Read docs first');
    expect(output).toContain('1 bindings');
  });

  it('should format empty renovation history', () => {
    const output = formatRenovationHistory(TEST_DIR);
    expect(output).toContain('No renovation records');
  });

  it('should format renovation history with records', () => {
    addRenovation(TEST_DIR, 'rtc', 1);
    updateRenovation(TEST_DIR, 1, {
      discoveries: ['Found new API'],
      fixes: ['Fixed field name'],
      status: 'completed',
    });

    const output = formatRenovationHistory(TEST_DIR);
    expect(output).toContain('DONE');
    expect(output).toContain('Found new API');
    expect(output).toContain('Fixed field name');
  });

  it('should filter renovation history by domain', () => {
    addRenovation(TEST_DIR, 'rtc', 1);
    addRenovation(TEST_DIR, 'stripe', 1);

    const rtcOnly = formatRenovationHistory(TEST_DIR, 'rtc');
    expect(rtcOnly).toContain('rtc');
    expect(rtcOnly).not.toContain('stripe');
  });
});

describe('Compliance scores', () => {
  it('should load empty compliance from non-existent file', () => {
    const data = loadCompliance(TEST_DIR);
    expect(data.scores).toEqual([]);
  });

  it('should save and persist a compliance score', () => {
    const score = saveComplianceScore(TEST_DIR, 'rtc', 8, 10);
    expect(score.score).toBe(80);
    expect(score.domain).toBe('rtc');

    const loaded = loadCompliance(TEST_DIR);
    expect(loaded.scores.length).toBe(1);
  });

  it('should calculate score percentage correctly', () => {
    expect(saveComplianceScore(TEST_DIR, 'a', 3, 4).score).toBe(75);
    expect(saveComplianceScore(TEST_DIR, 'b', 10, 10).score).toBe(100);
    expect(saveComplianceScore(TEST_DIR, 'c', 0, 5).score).toBe(0);
    expect(saveComplianceScore(TEST_DIR, 'd', 0, 0).score).toBe(0);
  });

  it('should format compliance trend', () => {
    saveComplianceScore(TEST_DIR, 'rtc', 6, 10);
    saveComplianceScore(TEST_DIR, 'rtc', 8, 10);

    const trend = formatComplianceTrend(TEST_DIR, 'rtc');
    expect(trend).toContain('rtc');
    expect(trend).toContain('improving');
  });

  it('should detect declining trend', () => {
    saveComplianceScore(TEST_DIR, 'rtc', 9, 10);
    saveComplianceScore(TEST_DIR, 'rtc', 5, 10);

    const trend = formatComplianceTrend(TEST_DIR, 'rtc');
    expect(trend).toContain('DECLINING');
    expect(trend).toContain('renovation');
  });

  it('should return empty string when no scores', () => {
    expect(formatComplianceTrend(TEST_DIR)).toBe('');
  });
});

describe('CLAUDE.md snippet generation', () => {
  it('should generate a valid snippet', () => {
    const binding = registerDoc(TEST_DIR, 'volcano-rtc', ['docs/rtc.md'], ['src/rtc/**'], 'Read docs first');
    const snippet = generateClaudeMdSnippet(binding);
    expect(snippet).toContain('volcano-rtc');
    expect(snippet).toContain('Read docs first');
    expect(snippet).toContain('src/rtc/**');
    expect(snippet).toContain('docs/rtc.md');
    expect(snippet).toContain('Do NOT guess');
  });
});

describe('Malformed data handling', () => {
  it('should handle malformed docs.json gracefully', () => {
    mkdirSync(join(TEST_DIR, '.callout'), { recursive: true });
    writeFileSync(join(TEST_DIR, '.callout', 'docs.json'), 'not json');
    expect(loadDocs(TEST_DIR).bindings).toEqual([]);
  });

  it('should handle malformed renovations.json gracefully', () => {
    mkdirSync(join(TEST_DIR, '.callout'), { recursive: true });
    writeFileSync(join(TEST_DIR, '.callout', 'renovations.json'), '{}');
    expect(loadRenovations(TEST_DIR).records).toEqual([]);
  });

  it('should handle malformed compliance.json gracefully', () => {
    mkdirSync(join(TEST_DIR, '.callout'), { recursive: true });
    writeFileSync(join(TEST_DIR, '.callout', 'compliance.json'), 'bad');
    expect(loadCompliance(TEST_DIR).scores).toEqual([]);
  });
});
