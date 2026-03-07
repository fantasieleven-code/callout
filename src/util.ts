export function resolvePath(project_path?: string): string {
  if (!project_path) {
    console.error('[callout] Warning: project_path not provided, falling back to process.cwd(). Results may be inaccurate if the MCP server was not started from the project root.');
    return process.cwd();
  }
  return project_path;
}

export function withPathHeader(prompt: string, cwd: string): string {
  return `> Scanning: \`${cwd}\`\n\n${prompt}`;
}
