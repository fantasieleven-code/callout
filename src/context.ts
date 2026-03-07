import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import type { PackageJson, ProjectContext } from './types.js';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '.cache', '__pycache__', '.venv', 'venv',
  'target', '.idea', '.vscode',
]);

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.rb', '.php', '.swift', '.kt', '.cs', '.cpp', '.c', '.h',
  '.vue', '.svelte', '.prisma', '.sql', '.graphql',
]);

const TEST_PATTERNS = [/\.test\./, /\.spec\./, /__tests__/, /test\//];

async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

async function walkDir(
  dir: string,
  root: string,
  files: string[],
  depth = 0,
): Promise<void> {
  if (depth > 8) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath);

    if (entry.isDirectory()) {
      files.push(relPath + '/');
      await walkDir(fullPath, root, files, depth + 1);
    } else {
      files.push(relPath);
    }
  }
}

function detectTechStack(packageJson: PackageJson | null, files: string[]): string[] {
  const stack: string[] = [];

  if (packageJson) {
    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    if (deps['react']) stack.push('React');
    if (deps['vue']) stack.push('Vue');
    if (deps['svelte']) stack.push('Svelte');
    if (deps['next']) stack.push('Next.js');
    if (deps['nuxt']) stack.push('Nuxt');
    if (deps['express']) stack.push('Express');
    if (deps['fastify']) stack.push('Fastify');
    if (deps['@nestjs/core']) stack.push('NestJS');
    if (deps['prisma'] || deps['@prisma/client']) stack.push('Prisma');
    if (deps['drizzle-orm']) stack.push('Drizzle');
    if (deps['tailwindcss']) stack.push('Tailwind CSS');
    if (deps['vitest']) stack.push('Vitest');
    if (deps['jest']) stack.push('Jest');
    if (deps['typescript']) stack.push('TypeScript');
  }

  if (files.some(f => f.endsWith('.py'))) stack.push('Python');
  if (files.some(f => f.endsWith('.go'))) stack.push('Go');
  if (files.some(f => f.endsWith('.rs'))) stack.push('Rust');
  if (files.some(f => f === 'Dockerfile' || f.endsWith('/Dockerfile'))) stack.push('Docker');

  return [...new Set(stack)];
}

export async function collectContext(cwd: string): Promise<ProjectContext> {
  const files: string[] = [];
  await walkDir(cwd, cwd, files);

  // Read key files
  const packageJsonRaw = await readFileOrNull(join(cwd, 'package.json'));
  const packageJson = packageJsonRaw ? JSON.parse(packageJsonRaw) as PackageJson : null;
  const readme = await readFileOrNull(join(cwd, 'README.md'));
  const claudeMd = await readFileOrNull(join(cwd, 'CLAUDE.md'));

  // Stats
  const codeFiles = files.filter(f => CODE_EXTENSIONS.has(extname(f)));
  const testFiles = files.filter(f => TEST_PATTERNS.some(p => p.test(f)));

  let codeLines = 0;
  for (const f of codeFiles.slice(0, 200)) {
    try {
      const content = await readFile(join(cwd, f), 'utf-8');
      codeLines += content.split('\n').length;
    } catch {
      // skip unreadable files
    }
  }

  // Build tree (top 3 levels for brevity)
  const treeLines = files
    .filter(f => f.split('/').length <= 3)
    .slice(0, 100)
    .map(f => {
      const depth = f.split('/').length - 1;
      const indent = '  '.repeat(depth);
      const name = f.split('/').pop() || f;
      return `${indent}${f.endsWith('/') ? name + '/' : name}`;
    });

  return {
    cwd,
    name: packageJson?.name || cwd.split('/').pop() || 'unknown',
    fileTree: treeLines.join('\n'),
    packageJson,
    readme: readme ? readme.slice(0, 3000) : null,
    claudeMd: claudeMd ? claudeMd.slice(0, 5000) : null,
    techStack: detectTechStack(packageJson, files),
    stats: {
      totalFiles: files.filter(f => !f.endsWith('/')).length,
      testFiles: testFiles.length,
      codeLines,
    },
  };
}
