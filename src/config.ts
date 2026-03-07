import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { ProjectContext } from './types.js';

const ConfigSchema = z.object({
  target_user: z.string().optional(),
});

export interface CalloutConfig {
  target_user?: string;
}

function configPath(cwd: string): string {
  return join(cwd, '.callout', 'config.json');
}

export function loadConfig(cwd: string): CalloutConfig {
  const path = configPath(cwd);
  if (!existsSync(path)) return {};
  try {
    const parsed = ConfigSchema.safeParse(JSON.parse(readFileSync(path, 'utf-8')));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function saveConfig(cwd: string, config: CalloutConfig): void {
  const dir = join(cwd, '.callout');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  // Merge with existing config
  const existing = loadConfig(cwd);
  const merged = { ...existing, ...config };
  writeFileSync(configPath(cwd), JSON.stringify(merged, null, 2) + '\n');
}

/**
 * Try to infer target user from project context.
 * Scans README, CLAUDE.md, and package.json description for clues.
 * Returns undefined if no clear signal found — the prompt will ask AI to infer.
 */
export function inferTargetUser(ctx: ProjectContext): string | undefined {
  const sources = [
    ctx.readme,
    ctx.claudeMd,
    ctx.packageJson?.description,
  ].filter(Boolean).join('\n').toLowerCase();

  if (!sources) return undefined;

  // Look for explicit target user patterns
  const patterns = [
    // "for X" / "designed for X" / "built for X" / "helps X"
    /(?:for|designed for|built for|helps|aimed at|targeting|target(?:ed)? (?:at|to))\s+([^.!?\n]{5,60})/gi,
    // "目标用户" / "面向" patterns (Chinese)
    /(?:目标用户|面向|服务于|针对)[：:\s]*([^。！？\n]{3,40})/g,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(sources);
    if (match?.[1]) {
      const candidate = match[1].trim();
      // Filter out overly generic or technical descriptions
      if (candidate.length >= 5 && !isGeneric(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function isGeneric(s: string): boolean {
  const generic = ['everyone', 'developers', 'users', 'people', 'anyone', 'all'];
  return generic.some(g => s.toLowerCase() === g);
}

/**
 * Get the target user for review — from config, inference, or fallback.
 * If inferred for the first time, persist to config for future use.
 */
export function getTargetUser(cwd: string, ctx: ProjectContext): string | undefined {
  // 1. Check persisted config
  const config = loadConfig(cwd);
  if (config.target_user) return config.target_user;

  // 2. Try to infer from project files
  const inferred = inferTargetUser(ctx);
  if (inferred) {
    // Persist so we don't re-infer every time
    saveConfig(cwd, { target_user: inferred });
    return inferred;
  }

  // 3. No signal — return undefined, prompt will ask AI to infer
  return undefined;
}
