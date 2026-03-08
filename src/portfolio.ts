import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { z } from 'zod';

export interface ProjectSummary {
  name: string;
  path: string;
  hasCallout: boolean;
  techStack: string[];
  todoOpen: number;
  todoMust: number;
  todoInProgress: number;
  todoDone: number;
  lastReviewDate: string | null;
  lastReviewSummary: string | null;
  description: string | null;
}

const TodoItemSchema = z.object({
  priority: z.enum(['must', 'should', 'nice']),
  status: z.enum(['open', 'in_progress', 'done', 'wont_do']),
}).passthrough();

const TodoListSchema = z.object({
  items: z.array(TodoItemSchema),
}).passthrough();

const ReviewSchema = z.object({
  date: z.string(),
  findingSummary: z.string().optional(),
}).passthrough();

const HistorySchema = z.object({
  reviews: z.array(ReviewSchema),
}).passthrough();

function readJsonSafe<T>(path: string, schema: z.ZodType<T>): T | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(readFileSync(path, 'utf-8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function getProjectDescription(projectPath: string): string | null {
  // Try README first line after title
  const readmePath = join(projectPath, 'README.md');
  if (existsSync(readmePath)) {
    try {
      const content = readFileSync(readmePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length > 0) return lines[0].trim().slice(0, 200);
    } catch { /* skip */ }
  }

  // Try package.json description
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.description) return pkg.description;
    } catch { /* skip */ }
  }

  return null;
}

function getTechStack(projectPath: string): string[] {
  const stack: string[] = [];
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['react'] || deps['next']) stack.push('React/Next.js');
      if (deps['vue'] || deps['nuxt']) stack.push('Vue/Nuxt');
      if (deps['express'] || deps['fastify']) stack.push('Node.js');
      if (deps['typescript']) stack.push('TypeScript');
      if (deps['prisma'] || deps['@prisma/client']) stack.push('Prisma');
      if (deps['tailwindcss']) stack.push('Tailwind');
    } catch { /* skip */ }
  }

  // Check for other languages
  try {
    const files = readdirSync(projectPath);
    if (files.some(f => f.endsWith('.py') || f === 'requirements.txt')) stack.push('Python');
    if (files.some(f => f.endsWith('.go') || f === 'go.mod')) stack.push('Go');
    if (files.some(f => f.endsWith('.rs') || f === 'Cargo.toml')) stack.push('Rust');
  } catch { /* skip */ }

  return [...new Set(stack)];
}

export function scanProjects(rootPath: string): ProjectSummary[] {
  const projects: ProjectSummary[] = [];

  let entries: string[];
  try {
    entries = readdirSync(rootPath);
  } catch {
    return projects;
  }

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const fullPath = join(rootPath, entry);

    try {
      if (!statSync(fullPath).isDirectory()) continue;
    } catch {
      continue;
    }

    // Is this a project? Check for .callout/, package.json, or .git
    const hasCallout = existsSync(join(fullPath, '.callout'));
    const hasPkg = existsSync(join(fullPath, 'package.json'));
    const hasGit = existsSync(join(fullPath, '.git'));

    if (!hasCallout && !hasPkg && !hasGit) continue;

    const summary: ProjectSummary = {
      name: basename(fullPath),
      path: fullPath,
      hasCallout,
      techStack: getTechStack(fullPath),
      todoOpen: 0,
      todoMust: 0,
      todoInProgress: 0,
      todoDone: 0,
      lastReviewDate: null,
      lastReviewSummary: null,
      description: getProjectDescription(fullPath),
    };

    if (hasCallout) {
      // Read todos
      const todos = readJsonSafe(join(fullPath, '.callout', 'todo.json'), TodoListSchema);
      if (todos) {
        for (const item of todos.items) {
          if (item.status === 'open') {
            summary.todoOpen++;
            if (item.priority === 'must') summary.todoMust++;
          }
          if (item.status === 'in_progress') summary.todoInProgress++;
          if (item.status === 'done') summary.todoDone++;
        }
      }

      // Read review history
      const history = readJsonSafe(join(fullPath, '.callout', 'history.json'), HistorySchema);
      if (history && history.reviews.length > 0) {
        const last = history.reviews[history.reviews.length - 1];
        summary.lastReviewDate = last.date;
        summary.lastReviewSummary = last.findingSummary || null;
      }
    }

    projects.push(summary);
  }

  // Sort: MUST FIX projects first, then unreviewed, then healthy
  projects.sort((a, b) => {
    if (a.todoMust !== b.todoMust) return b.todoMust - a.todoMust;
    if (a.hasCallout !== b.hasCallout) return a.hasCallout ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return projects;
}

export function buildPortfolioPrompt(projects: ProjectSummary[]): string {
  if (projects.length === 0) {
    return 'No projects found in the specified directory. Make sure the path contains project directories with package.json, .git, or .callout/.';
  }

  const lines: string[] = [
    `# Portfolio Overview (${projects.length} projects)`,
    '',
  ];

  // Summary stats
  const totalMust = projects.reduce((s, p) => s + p.todoMust, 0);
  const unreviewed = projects.filter(p => !p.hasCallout).length;
  const stale = projects.filter(p => {
    if (!p.lastReviewDate) return false;
    const daysSince = Math.floor((Date.now() - new Date(p.lastReviewDate).getTime()) / 86400000);
    return daysSince > 7;
  }).length;

  if (totalMust > 0) lines.push(`**${totalMust} MUST FIX items across all projects**`, '');
  if (unreviewed > 0) lines.push(`**${unreviewed} project(s) never reviewed by Callout**`, '');
  if (stale > 0) lines.push(`**${stale} project(s) not reviewed in 7+ days**`, '');

  lines.push('---', '');

  // Per-project details
  for (const p of projects) {
    const status = p.todoMust > 0
      ? `MUST FIX: ${p.todoMust}`
      : p.hasCallout
        ? 'Healthy'
        : 'Not reviewed';

    const icon = p.todoMust > 0 ? '[!!]' : p.hasCallout ? '[OK]' : '[??]';

    lines.push(`## ${icon} ${p.name}`);
    if (p.description) lines.push(`> ${p.description}`);
    lines.push('');

    lines.push(`- **Status**: ${status}`);
    if (p.techStack.length > 0) lines.push(`- **Stack**: ${p.techStack.join(', ')}`);
    lines.push(`- **Path**: \`${p.path}\``);

    if (p.hasCallout) {
      const todoTotal = p.todoOpen + p.todoInProgress;
      lines.push(`- **Active todos**: ${todoTotal} (${p.todoMust} MUST, ${p.todoOpen - p.todoMust} other open, ${p.todoInProgress} in progress)`);
      lines.push(`- **Completed**: ${p.todoDone}`);

      if (p.lastReviewDate) {
        const daysSince = Math.floor((Date.now() - new Date(p.lastReviewDate).getTime()) / 86400000);
        const freshness = daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`;
        lines.push(`- **Last review**: ${freshness}`);
        if (p.lastReviewSummary) lines.push(`- **Findings**: ${p.lastReviewSummary}`);
      } else {
        lines.push('- **Last review**: never');
      }
    } else {
      lines.push('- **Callout**: not set up — run `review` with `project_path` set to this project');
    }

    lines.push('');
  }

  // Decision prompt
  lines.push(
    '---',
    '',
    '## Action Required',
    '',
    'Based on the data above, please:',
    '',
    '1. **Ask the user**: What is the business priority of each project? (Which one is closest to revenue? Which has the most urgent deadline?)',
    '2. **After the user responds**, give:',
    '   - **Today\'s recommendation**: Which project to work on and what to do first',
    '   - **Top 3 risks** across all projects',
    '   - **Resource allocation suggestion**: How to split time this week',
    '3. For unreviewed projects, suggest running `review` with the project path',
    '4. For projects with MUST FIX items, list them as immediate priorities',
    '',
    'Frame your advice from a **founder perspective** — not just technical, but business impact.',
  );

  return lines.join('\n');
}
