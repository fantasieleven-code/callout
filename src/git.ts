import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';

function validateCwd(cwd: string): boolean {
  return isAbsolute(cwd) && existsSync(cwd);
}

function runGit(cmd: string, cwd: string, maxBytes = 8000): string {
  if (!validateCwd(cwd)) return '';
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.length > maxBytes
      ? output.slice(0, maxBytes) + '\n... (truncated)'
      : output;
  } catch {
    return '';
  }
}

export function isGitRepo(cwd: string): boolean {
  if (!validateCwd(cwd)) return false;
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

export function getGitDiff(cwd: string): string {
  // Staged + unstaged changes
  const diff = runGit('git diff HEAD', cwd);
  if (diff) return diff;

  // If no HEAD (fresh repo), show staged
  return runGit('git diff --staged', cwd);
}

export function getRecentFiles(cwd: string): string {
  return runGit('git log --oneline -10 --name-only', cwd);
}

export function getCommitStats(cwd: string): string {
  return runGit('git log --oneline -50 --name-only', cwd, 30000);
}

export function getCommitMessages(cwd: string): string {
  return runGit('git log --oneline -20', cwd);
}
