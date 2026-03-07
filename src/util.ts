export function resolvePath(project_path?: string): string {
  return project_path || process.cwd();
}

export function withPathHeader(prompt: string, cwd: string): string {
  return `> Scanning: \`${cwd}\`\n\n${prompt}`;
}
