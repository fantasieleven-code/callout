import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { Scene } from './prompts/recommend.js';

const DismissedSchema = z.object({
  dismissed: z.array(z.string()),
});

export interface DismissedData {
  dismissed: string[];
}

function dismissedPath(cwd: string): string {
  return join(cwd, '.callout', 'dismissed.json');
}

export function loadDismissed(cwd: string): DismissedData {
  const path = dismissedPath(cwd);
  if (!existsSync(path)) {
    return { dismissed: [] };
  }
  try {
    const parsed = DismissedSchema.safeParse(JSON.parse(readFileSync(path, 'utf-8')));
    return parsed.success ? parsed.data : { dismissed: [] };
  } catch {
    return { dismissed: [] };
  }
}

export function saveDismissed(cwd: string, data: DismissedData): void {
  const dir = join(cwd, '.callout');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(dismissedPath(cwd), JSON.stringify(data, null, 2) + '\n');
}

export function dismissScene(cwd: string, scene: Scene): void {
  const data = loadDismissed(cwd);
  if (!data.dismissed.includes(scene)) {
    data.dismissed.push(scene);
    saveDismissed(cwd, data);
  }
}

export function filterDismissed(cwd: string, scenes: Scene[]): Scene[] {
  const data = loadDismissed(cwd);
  return scenes.filter((s) => !data.dismissed.includes(s));
}

export function resetDismissed(cwd: string): string[] {
  const data = loadDismissed(cwd);
  const cleared = [...data.dismissed];
  saveDismissed(cwd, { dismissed: [] });
  return cleared;
}
