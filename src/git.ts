import { execSync } from 'node:child_process';

function runGit(cmd: string, cwd: string, maxBytes = 8000): string {
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
