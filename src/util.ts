import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export function resolvePath(project_path?: string): string {
  if (!project_path) {
    console.error('[callout] Warning: project_path not provided, falling back to process.cwd(). Results may be inaccurate if the MCP server was not started from the project root.');
    return process.cwd();
  }

  // Normalize to absolute path
  const resolved = isAbsolute(project_path) ? project_path : resolve(project_path);

  // Verify the path exists
  if (!existsSync(resolved)) {
    throw new Error(`project_path does not exist: ${resolved}`);
  }

  return resolved;
}

export function withPathHeader(prompt: string, cwd: string): string {
  return `> Scanning: \`${cwd}\`\n\n${prompt}`;
}
