import type { ProjectContext } from '../types.js';

export type Scene =
  | 'auth'
  | 'database'
  | 'payments'
  | 'email'
  | 'file-upload'
  | 'search'
  | 'analytics'
  | 'monitoring'
  | 'ci-cd'
  | 'deployment'
  | 'testing'
  | 'styling'
  | 'state-management'
  | 'api';

interface SceneRule {
  scene: Scene;
  label: string;
  match: (ctx: ProjectContext, task?: string) => boolean;
}

const SCENE_RULES: SceneRule[] = [
  {
    scene: 'auth',
    label: 'Authentication / Authorization',
    match: (ctx, task) =>
      hasKeyword(task, ['auth', 'login', 'signup', 'sign-up', 'sign-in', 'oauth', 'jwt', 'session', 'password', 'register']) ||
      hasDep(ctx, ['passport', 'next-auth', 'lucia', '@auth/', 'firebase', 'supabase', '@clerk/', 'jsonwebtoken']),
  },
  {
    scene: 'database',
    label: 'Database / ORM',
    match: (ctx, task) =>
      hasKeyword(task, ['database', 'db', 'sql', 'postgres', 'mysql', 'mongo', 'orm', 'migration', 'schema', 'query']) ||
      hasDep(ctx, ['prisma', 'drizzle-orm', 'typeorm', 'sequelize', 'mongoose', 'knex', '@planetscale/', 'pg', 'mysql2']),
  },
  {
    scene: 'payments',
    label: 'Payments / Billing',
    match: (ctx, task) =>
      hasKeyword(task, ['payment', 'billing', 'stripe', 'checkout', 'subscription', 'invoice', 'pricing', 'plan']) ||
      hasDep(ctx, ['stripe', '@stripe/', 'lemon-squeezy', '@lemonsqueezy/']),
  },
  {
    scene: 'email',
    label: 'Email / Notifications',
    match: (ctx, task) =>
      hasKeyword(task, ['email', 'mail', 'smtp', 'notification', 'newsletter', 'transactional']) ||
      hasDep(ctx, ['nodemailer', 'resend', '@sendgrid/', 'postmark', '@react-email/']),
  },
  {
    scene: 'file-upload',
    label: 'File Upload / Storage',
    match: (ctx, task) =>
      hasKeyword(task, ['upload', 'file', 'image', 'storage', 's3', 'blob', 'cdn']) ||
      hasDep(ctx, ['multer', '@aws-sdk/client-s3', 'uploadthing', '@vercel/blob']),
  },
  {
    scene: 'search',
    label: 'Search',
    match: (ctx, task) =>
      hasKeyword(task, ['search', 'full-text', 'elasticsearch', 'algolia', 'meilisearch', 'typesense']) ||
      hasDep(ctx, ['algoliasearch', 'meilisearch', 'typesense', '@elastic/']),
  },
  {
    scene: 'analytics',
    label: 'Analytics / Tracking',
    match: (ctx, task) =>
      hasKeyword(task, ['analytics', 'tracking', 'event', 'metrics', 'dashboard', 'posthog', 'mixpanel']) ||
      hasDep(ctx, ['posthog-js', 'posthog-node', 'mixpanel', '@segment/', '@amplitude/']),
  },
  {
    scene: 'monitoring',
    label: 'Error Monitoring / Logging',
    match: (ctx, task) =>
      hasKeyword(task, ['monitoring', 'error tracking', 'logging', 'sentry', 'observability', 'apm']) ||
      hasDep(ctx, ['@sentry/', 'winston', 'pino', 'datadog', '@datadog/']),
  },
  {
    scene: 'ci-cd',
    label: 'CI/CD',
    match: (ctx, task) =>
      hasKeyword(task, ['ci', 'cd', 'ci/cd', 'pipeline', 'github actions', 'deploy automatically']),
  },
  {
    scene: 'deployment',
    label: 'Deployment / Hosting',
    match: (ctx, task) =>
      hasKeyword(task, ['deploy', 'hosting', 'vercel', 'netlify', 'railway', 'fly.io', 'docker', 'kubernetes', 'k8s']),
  },
  {
    scene: 'testing',
    label: 'Testing',
    match: (ctx, task) =>
      hasKeyword(task, ['test', 'testing', 'e2e', 'unit test', 'integration test', 'playwright', 'cypress']) ||
      hasDep(ctx, ['vitest', 'jest', 'mocha', 'playwright', 'cypress', '@testing-library/']),
  },
  {
    scene: 'styling',
    label: 'Styling / UI Components',
    match: (ctx, task) =>
      hasKeyword(task, ['styling', 'css', 'tailwind', 'ui library', 'component library', 'design system', 'theme']) ||
      hasDep(ctx, ['tailwindcss', '@shadcn/', 'styled-components', '@emotion/', '@chakra-ui/', '@mantine/', '@radix-ui/']),
  },
  {
    scene: 'state-management',
    label: 'State Management',
    match: (ctx, task) =>
      hasKeyword(task, ['state management', 'redux', 'zustand', 'jotai', 'recoil', 'global state']) ||
      hasDep(ctx, ['redux', '@reduxjs/toolkit', 'zustand', 'jotai', 'recoil', 'mobx', 'valtio']),
  },
  {
    scene: 'api',
    label: 'API Layer / Data Fetching',
    match: (ctx, task) =>
      hasKeyword(task, ['api', 'rest', 'graphql', 'trpc', 'data fetching', 'endpoint', 'openapi', 'swagger']) ||
      hasDep(ctx, ['@trpc/', 'graphql', 'apollo', '@tanstack/react-query', 'swr', 'axios']),
  },
];

function hasKeyword(task: string | undefined, keywords: string[]): boolean {
  if (!task) return false;
  const lower = task.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function hasDep(ctx: ProjectContext, prefixes: string[]): boolean {
  if (!ctx.packageJson) return false;
  const allDeps = {
    ...ctx.packageJson.dependencies,
    ...ctx.packageJson.devDependencies,
  };
  const depNames = Object.keys(allDeps);
  return prefixes.some((prefix) =>
    depNames.some((d) => d === prefix || d.startsWith(prefix)),
  );
}

export function detectScenes(ctx: ProjectContext, task?: string): Scene[] {
  return SCENE_RULES
    .filter((rule) => rule.match(ctx, task))
    .map((rule) => rule.scene);
}

export function getSceneLabel(scene: Scene): string {
  const rule = SCENE_RULES.find((r) => r.scene === scene);
  return rule ? rule.label : scene;
}

export function buildRecommendPrompt(
  ctx: ProjectContext,
  scenes: Scene[],
  task?: string,
): string {
  const sceneList = scenes
    .map((s) => `- **${getSceneLabel(s)}**`)
    .join('\n');

  const depsSection = ctx.packageJson
    ? `Current dependencies:\n\`\`\`json\n${JSON.stringify({ ...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies }, null, 2)}\n\`\`\``
    : 'No package.json found.';

  const taskSection = task
    ? `\nCurrent task: "${task}"\n`
    : '';

  return `You are a pragmatic tech advisor helping a non-technical founder choose the right tools.

## Project Context

- **Name**: ${ctx.name}
- **Tech stack**: ${ctx.techStack.join(', ') || 'Unknown'}
- **Files**: ${ctx.stats.totalFiles} files, ${ctx.stats.codeLines} lines of code
${taskSection}
${depsSection}

## Detected Scenarios

The following scenarios were detected based on the current task and project dependencies:

${sceneList}

## Your Task

For EACH scenario listed above, recommend the **single best tool/service** for a solo non-technical founder doing a 0→1 build. Prioritize:
1. **Fastest to integrate** — the founder is using AI coding tools, so developer experience matters less than API simplicity
2. **Generous free tier** — the project has no revenue yet
3. **Managed service over self-hosted** — less operational burden
4. **Popular enough that AI coding tools know it well** — obscure tools produce worse AI-generated code

## Output Format

For each scenario, provide:

### [Scenario Name]

**Recommendation**: [Tool/Service name]
**Why this one**: [1-2 sentences — why it beats alternatives for a solo founder]
**Already using**: [If the project already has a tool for this, say "You already have [X] installed — no action needed" and skip the rest]

**Quick start**:
1. Install command (copy-pasteable)
2. Key setup step (e.g. "Create account at X, get API key")
3. First integration step (e.g. "Add this to your env file")

**Alternatives worth knowing**: [1-2 alternatives and when you'd pick them instead]

---

Important:
- Do NOT recommend tools the project already uses — acknowledge them as good choices
- If a scenario is already well-covered by existing dependencies, say so and move on
- Be opinionated — pick ONE tool, don't hedge with "it depends"
- Include actual install commands, not just tool names`;
}
