import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ReviewRecord {
  date: string;
  perspectives: string[];
  findingSummary: string;
}

export interface ReviewHistory {
  reviews: ReviewRecord[];
}

function historyDir(cwd: string): string {
  return join(cwd, '.archon');
}

function historyPath(cwd: string): string {
  return join(historyDir(cwd), 'history.json');
}

export function loadHistory(cwd: string): ReviewHistory {
  const path = historyPath(cwd);
  if (!existsSync(path)) {
    return { reviews: [] };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as ReviewHistory;
  } catch {
    return { reviews: [] };
  }
}

export function saveReview(cwd: string, record: ReviewRecord): void {
  const dir = historyDir(cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const history = loadHistory(cwd);

  // Keep last 50 reviews
  history.reviews.push(record);
  if (history.reviews.length > 50) {
    history.reviews = history.reviews.slice(-50);
  }

  writeFileSync(historyPath(cwd), JSON.stringify(history, null, 2) + '\n');
}

export function buildHistoryContext(cwd: string): string {
  const history = loadHistory(cwd);

  if (history.reviews.length === 0) {
    return '';
  }

  const recent = history.reviews.slice(-5);
  const lines = [
    '## Previous Review History',
    '',
    `Total reviews conducted: ${history.reviews.length}`,
    '',
    'Recent reviews:',
    '',
  ];

  for (const r of recent) {
    lines.push(`### ${r.date} (${r.perspectives.join(', ')})`);
    lines.push(r.findingSummary);
    lines.push('');
  }

  lines.push(
    '---',
    '',
    'Compare current findings against previous reviews. Highlight:',
    '- Issues that were found before and are still unresolved',
    '- New issues that appeared since the last review',
    '- Issues from previous reviews that have been fixed (acknowledge progress)',
    '',
  );

  return lines.join('\n');
}
