import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export interface DocBinding {
  /** Unique domain name, e.g. "volcano-rtc", "stripe-api" */
  domain: string;
  /** Paths to documentation files (relative to project root) */
  docs: string[];
  /** Glob patterns for protected code paths, e.g. "src/rtc/**" */
  scope: string[];
  /** Human-readable rule, e.g. "Must read Volcano AI docs before modifying RTC code" */
  rule: string;
  /** When this binding was created */
  createdAt: string;
}

export interface RenovationRecord {
  /** Unique ID */
  id: number;
  /** Domain this renovation targets */
  domain: string;
  /** What was discovered (new APIs, wrong fields, better approaches) */
  discoveries: string[];
  /** What was fixed */
  fixes: string[];
  /** Status */
  status: 'in_progress' | 'completed';
  /** Batch number for multi-batch renovations */
  batch: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocsConfig {
  bindings: DocBinding[];
}

export interface ComplianceScore {
  /** Domain this score is for */
  domain: string;
  /** Number of fields verified correct */
  correct: number;
  /** Total fields checked */
  total: number;
  /** Score as percentage */
  score: number;
  /** When this check was run */
  date: string;
}

export interface ComplianceHistory {
  scores: ComplianceScore[];
}

export interface RenovationsData {
  nextId: number;
  records: RenovationRecord[];
}

const DocBindingSchema = z.object({
  domain: z.string(),
  docs: z.array(z.string()),
  scope: z.array(z.string()),
  rule: z.string(),
  createdAt: z.string(),
});

const DocsConfigSchema = z.object({
  bindings: z.array(DocBindingSchema),
});

const RenovationRecordSchema = z.object({
  id: z.number(),
  domain: z.string(),
  discoveries: z.array(z.string()),
  fixes: z.array(z.string()),
  status: z.enum(['in_progress', 'completed']),
  batch: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const RenovationsDataSchema = z.object({
  nextId: z.number(),
  records: z.array(RenovationRecordSchema),
});

const ComplianceScoreSchema = z.object({
  domain: z.string(),
  correct: z.number(),
  total: z.number(),
  score: z.number(),
  date: z.string(),
});

const ComplianceHistorySchema = z.object({
  scores: z.array(ComplianceScoreSchema),
});

function docsPath(cwd: string): string {
  return join(cwd, '.callout', 'docs.json');
}

function renovationsPath(cwd: string): string {
  return join(cwd, '.callout', 'renovations.json');
}

function compliancePath(cwd: string): string {
  return join(cwd, '.callout', 'compliance.json');
}

function ensureCalloutDir(cwd: string): void {
  const dir = join(cwd, '.callout');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// --- Docs Config ---

export function loadDocs(cwd: string): DocsConfig {
  const path = docsPath(cwd);
  if (!existsSync(path)) {
    return { bindings: [] };
  }
  try {
    const parsed = DocsConfigSchema.safeParse(JSON.parse(readFileSync(path, 'utf-8')));
    return parsed.success ? parsed.data : { bindings: [] };
  } catch {
    return { bindings: [] };
  }
}

export function saveDocs(cwd: string, config: DocsConfig): void {
  ensureCalloutDir(cwd);
  writeFileSync(docsPath(cwd), JSON.stringify(config, null, 2) + '\n');
}

export function registerDoc(
  cwd: string,
  domain: string,
  docs: string[],
  scope: string[],
  rule: string,
): DocBinding {
  const config = loadDocs(cwd);

  // Upsert: replace if domain already exists
  const existingIndex = config.bindings.findIndex(b => b.domain === domain);
  const binding: DocBinding = {
    domain,
    docs,
    scope,
    rule,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    config.bindings[existingIndex] = binding;
  } else {
    config.bindings.push(binding);
  }

  saveDocs(cwd, config);
  return binding;
}

export function removeDoc(cwd: string, domain: string): boolean {
  const config = loadDocs(cwd);
  const before = config.bindings.length;
  config.bindings = config.bindings.filter(b => b.domain !== domain);
  if (config.bindings.length < before) {
    saveDocs(cwd, config);
    return true;
  }
  return false;
}

export function findBindingsForFile(cwd: string, filePath: string): DocBinding[] {
  const config = loadDocs(cwd);
  if (config.bindings.length === 0) return [];

  // Simple glob matching: supports * and **
  return config.bindings.filter(binding =>
    binding.scope.some(pattern => matchGlob(pattern, filePath)),
  );
}

/**
 * Simple glob matcher for scope patterns.
 * Supports: * (any segment chars), ** (any path segments), ? (single char)
 */
export function matchGlob(pattern: string, filePath: string): boolean {
  // Normalize separators
  const normalizedPattern = pattern.replace(/\\/g, '/');
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Convert glob to regex:
  // 1. Preserve ** and * markers
  // 2. Escape all regex special chars in the rest
  // 3. Replace markers with regex equivalents
  const regexStr = normalizedPattern
    .replace(/\*\*/g, '§DOUBLESTAR§')
    .replace(/\*/g, '§STAR§')
    .replace(/\?/g, '§QUESTION§')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex specials
    .replace(/§DOUBLESTAR§/g, '.*')
    .replace(/§STAR§/g, '[^/]*')
    .replace(/§QUESTION§/g, '[^/]');

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(normalizedPath);
}

// --- Renovations ---

export function loadRenovations(cwd: string): RenovationsData {
  const path = renovationsPath(cwd);
  if (!existsSync(path)) {
    return { nextId: 1, records: [] };
  }
  try {
    const parsed = RenovationsDataSchema.safeParse(JSON.parse(readFileSync(path, 'utf-8')));
    return parsed.success ? parsed.data : { nextId: 1, records: [] };
  } catch {
    return { nextId: 1, records: [] };
  }
}

export function saveRenovations(cwd: string, data: RenovationsData): void {
  ensureCalloutDir(cwd);
  writeFileSync(renovationsPath(cwd), JSON.stringify(data, null, 2) + '\n');
}

export function addRenovation(
  cwd: string,
  domain: string,
  batch: number,
): RenovationRecord {
  const data = loadRenovations(cwd);
  const now = new Date().toISOString();
  const record: RenovationRecord = {
    id: data.nextId,
    domain,
    discoveries: [],
    fixes: [],
    status: 'in_progress',
    batch,
    createdAt: now,
    updatedAt: now,
  };
  data.records.push(record);
  data.nextId++;
  saveRenovations(cwd, data);
  return record;
}

export function updateRenovation(
  cwd: string,
  id: number,
  updates: Partial<Pick<RenovationRecord, 'discoveries' | 'fixes' | 'status'>>,
): RenovationRecord | null {
  const data = loadRenovations(cwd);
  const record = data.records.find(r => r.id === id);
  if (!record) return null;

  if (updates.discoveries !== undefined) record.discoveries = updates.discoveries;
  if (updates.fixes !== undefined) record.fixes = updates.fixes;
  if (updates.status !== undefined) record.status = updates.status;
  record.updatedAt = new Date().toISOString();

  saveRenovations(cwd, data);
  return record;
}

// --- Compliance Score ---

const MAX_COMPLIANCE_SCORES = 100;

export function loadCompliance(cwd: string): ComplianceHistory {
  const path = compliancePath(cwd);
  if (!existsSync(path)) {
    return { scores: [] };
  }
  try {
    const parsed = ComplianceHistorySchema.safeParse(JSON.parse(readFileSync(path, 'utf-8')));
    return parsed.success ? parsed.data : { scores: [] };
  } catch {
    return { scores: [] };
  }
}

export function saveComplianceScore(
  cwd: string,
  domain: string,
  correct: number,
  total: number,
): ComplianceScore {
  ensureCalloutDir(cwd);
  const history = loadCompliance(cwd);
  const score: ComplianceScore = {
    domain,
    correct,
    total,
    score: total > 0 ? Math.round((correct / total) * 100) : 0,
    date: new Date().toISOString(),
  };
  history.scores.push(score);
  if (history.scores.length > MAX_COMPLIANCE_SCORES) {
    history.scores = history.scores.slice(-MAX_COMPLIANCE_SCORES);
  }
  writeFileSync(compliancePath(cwd), JSON.stringify(history, null, 2) + '\n');
  return score;
}

export function formatComplianceTrend(cwd: string, domain?: string): string {
  const history = loadCompliance(cwd);
  let scores = history.scores;
  if (domain) {
    scores = scores.filter(s => s.domain === domain);
  }

  if (scores.length === 0) {
    return '';
  }

  const recent = scores.slice(-10);
  const lines = [
    `## Compliance Trend${domain ? ` (${domain})` : ''} — last ${recent.length} checks`,
    '',
  ];

  for (const s of recent) {
    const bar = s.score >= 80 ? 'PASS' : 'WARN';
    lines.push(`- ${s.date.split('T')[0]} [${bar}] ${s.domain}: ${s.correct}/${s.total} (${s.score}%)`);
  }

  // Trend analysis
  if (recent.length >= 2) {
    const first = recent[0].score;
    const last = recent[recent.length - 1].score;
    const diff = last - first;
    lines.push('');
    if (diff > 0) {
      lines.push(`Trend: improving (+${diff}%)`);
    } else if (diff < 0) {
      lines.push(`Trend: DECLINING (${diff}%) — recommend running \`renovation\``);
    } else {
      lines.push('Trend: stable');
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function generateClaudeMdSnippet(binding: DocBinding): string {
  const lines = [
    `### ${binding.domain}`,
    `- ${binding.rule}`,
    `- Scope: ${binding.scope.join(', ')}`,
    `- Before editing files in scope, MUST read: ${binding.docs.join(', ')}`,
    `- Do NOT guess field names, parameter values, or defaults — verify against docs or ask user`,
    `- Common AI mistakes: verb tense (onUserJoin vs onUserJoined), naming style (room_id vs roomId), unit suffix (timeout vs timeoutMs), invented defaults`,
  ];
  return lines.join('\n');
}

export function generateFullClaudeMdSection(cwd: string): string {
  const config = loadDocs(cwd);
  if (config.bindings.length === 0) return '';

  const lines = [
    '## Domain Knowledge Rules (managed by Callout)',
    '',
  ];
  for (const b of config.bindings) {
    lines.push(generateClaudeMdSnippet(b));
    lines.push('');
  }
  return lines.join('\n');
}

export function formatDocsOverview(cwd: string): string {
  const config = loadDocs(cwd);
  if (config.bindings.length === 0) {
    return 'No documentation bindings registered. Use `doc_register` to bind docs to code paths.';
  }

  const lines = [
    `# Domain Knowledge Guard (${config.bindings.length} bindings)`,
    '',
  ];

  for (const b of config.bindings) {
    lines.push(`## ${b.domain}`);
    lines.push(`- **Rule**: ${b.rule}`);
    lines.push(`- **Docs**: ${b.docs.join(', ')}`);
    lines.push(`- **Scope**: ${b.scope.join(', ')}`);
    lines.push(`- Registered: ${b.createdAt.split('T')[0]}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function formatRenovationHistory(cwd: string, domain?: string): string {
  const data = loadRenovations(cwd);
  let records = data.records;
  if (domain) {
    records = records.filter(r => r.domain === domain);
  }

  if (records.length === 0) {
    return domain
      ? `No renovation records for domain "${domain}".`
      : 'No renovation records. Use `renovation` to start a domain knowledge renovation.';
  }

  const lines = [
    `# Renovation History (${records.length} records)`,
    '',
  ];

  for (const r of records) {
    const status = r.status === 'completed' ? '[DONE]' : '[IN PROGRESS]';
    lines.push(`## ${status} #${r.id} — ${r.domain} (Batch ${r.batch})`);
    if (r.discoveries.length > 0) {
      lines.push('**Discoveries:**');
      for (const d of r.discoveries) {
        lines.push(`  - ${d}`);
      }
    }
    if (r.fixes.length > 0) {
      lines.push('**Fixes:**');
      for (const f of r.fixes) {
        lines.push(`  - ${f}`);
      }
    }
    lines.push(`Updated: ${r.updatedAt.split('T')[0]}`);
    lines.push('');
  }

  return lines.join('\n');
}
