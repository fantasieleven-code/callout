import { existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { ProjectContext } from './types.js';
import type { ProjectStage } from './guide.js';
import { loadDocs } from './docs.js';

export interface CoachSignals {
  hasClaudeMd: boolean;
  hasCursorRules: boolean;
  hasTypeScript: boolean;
  hasLinter: boolean;
  hasGitignore: boolean;
  hasTestScript: boolean;
  hasBuildScript: boolean;
  vagueFileNames: string[];
  testRatio: number; // testFiles / totalFiles
  unboundSdks: string[]; // SDK deps without doc bindings
}

const VAGUE_NAMES = ['utils', 'helpers', 'misc', 'common', 'stuff', 'temp', 'test'];

export function collectCoachSignals(cwd: string, context: ProjectContext): CoachSignals {
  const hasClaudeMd = existsSync(join(cwd, 'CLAUDE.md'));
  const hasCursorRules = existsSync(join(cwd, '.cursorrules'));
  const hasTypeScript = existsSync(join(cwd, 'tsconfig.json'));

  const hasLinter =
    existsSync(join(cwd, '.eslintrc.json')) ||
    existsSync(join(cwd, '.eslintrc.js')) ||
    existsSync(join(cwd, '.eslintrc.cjs')) ||
    existsSync(join(cwd, 'eslint.config.js')) ||
    existsSync(join(cwd, 'eslint.config.mjs')) ||
    existsSync(join(cwd, '.prettierrc')) ||
    existsSync(join(cwd, '.prettierrc.json')) ||
    existsSync(join(cwd, 'prettier.config.js')) ||
    existsSync(join(cwd, 'biome.json')) ||
    existsSync(join(cwd, 'biome.jsonc'));

  const hasGitignore = existsSync(join(cwd, '.gitignore'));

  const scripts = context.packageJson?.scripts || {};
  const hasTestScript = 'test' in scripts;
  const hasBuildScript = 'build' in scripts;

  // Scan for vague file names in file tree
  const vagueFileNames: string[] = [];
  const treeLines = context.fileTree.split('\n');
  for (const line of treeLines) {
    const name = basename(line.trim().replace(/\/$/, ''));
    const nameWithoutExt = name.replace(/\.[^.]+$/, '').toLowerCase();
    if (VAGUE_NAMES.includes(nameWithoutExt) && !line.trim().endsWith('/')) {
      vagueFileNames.push(line.trim());
    }
  }

  const testRatio = context.stats.totalFiles > 0
    ? context.stats.testFiles / context.stats.totalFiles
    : 0;

  // Detect SDK dependencies without doc bindings
  const SDK_INDICATORS = new Set([
    // Payment
    'stripe', '@stripe/stripe-js', 'alipay-sdk', 'wechatpay-node-v3',
    // Cloud/AI
    '@volcengine/rtc', '@volcengine/openapi', 'openai', '@anthropic-ai/sdk',
    'aws-sdk', '@aws-sdk/client-s3', '@google-cloud/storage', 'firebase', 'firebase-admin',
    // Auth
    '@auth0/auth0-spa-js', 'passport', 'next-auth',
    // Database
    'prisma', '@prisma/client', 'drizzle-orm', 'mongoose', 'typeorm',
    // Communication
    'twilio', '@sendgrid/mail', 'nodemailer',
    // Platform SDKs
    'wechat-jssdk', 'dingtalk-jsapi', 'lark-js-sdk',
  ]);

  const allDeps = {
    ...(context.packageJson?.dependencies || {}),
    ...(context.packageJson?.devDependencies || {}),
  };
  const sdkDeps = Object.keys(allDeps).filter(d => SDK_INDICATORS.has(d));

  const docsConfig = loadDocs(cwd);
  // Simple heuristic: check if any binding domain contains the dep name
  const unboundSdks = sdkDeps.filter(dep => {
    const depBase = dep.replace(/^@[^/]+\//, '').toLowerCase();
    return !docsConfig.bindings.some(b =>
      b.domain.toLowerCase().includes(depBase) ||
      b.docs.some(d => d.toLowerCase().includes(depBase)),
    );
  });

  return {
    hasClaudeMd,
    hasCursorRules,
    hasTypeScript,
    hasLinter,
    hasGitignore,
    hasTestScript,
    hasBuildScript,
    vagueFileNames,
    testRatio,
    unboundSdks,
  };
}

export function buildCoachPrompt(
  context: ProjectContext,
  signals: CoachSignals,
  gitStats: string,
  commitMessages: string,
  todoSummary: string,
  reviewCount: number,
  lastReviewDate: string | null,
  stage: ProjectStage,
): string {
  const sections = [
    `# AI Collaboration Coach: ${context.name}`,
    '',
    'You are a senior engineering coach who specializes in helping founders work effectively with AI coding tools. Your job is to reveal what the user DOES NOT KNOW they are doing wrong.',
    '',
    'Do NOT review the code quality (that is what `review` does). Instead, analyze the **human behavior patterns** — how the founder sets up their project, how they interact with AI, and what blind spots they have.',
    '',
    '---',
    '',
    '## Project Context',
    '',
    `- **Name**: ${context.name}`,
    `- **Stage**: ${stage}`,
    `- **Tech Stack**: ${context.techStack.join(', ') || 'Not detected'}`,
    `- **Scale**: ${context.stats.totalFiles} files, ${context.stats.testFiles} tests, ~${context.stats.codeLines} lines`,
    `- **Reviews completed**: ${reviewCount}${lastReviewDate ? ` (last: ${lastReviewDate})` : ''}`,
    '',
  ];

  // Module A: Environment signals
  sections.push(
    '## Module A: Environment Diagnosis',
    '',
    'Does the user give AI a good working environment?',
    '',
    `- CLAUDE.md / .cursorrules: ${signals.hasClaudeMd ? 'EXISTS' : 'MISSING'}${signals.hasCursorRules ? ' (.cursorrules also exists)' : ''}`,
    `- TypeScript: ${signals.hasTypeScript ? 'YES' : 'NO'}`,
    `- Linter/Formatter: ${signals.hasLinter ? 'YES' : 'NO'}`,
    `- .gitignore: ${signals.hasGitignore ? 'YES' : 'NO'}`,
    `- Test script (npm test): ${signals.hasTestScript ? 'YES' : 'NO'}`,
    `- Build script (npm run build): ${signals.hasBuildScript ? 'YES' : 'NO'}`,
    `- Test coverage ratio: ${(signals.testRatio * 100).toFixed(0)}% (${context.stats.testFiles} test files / ${context.stats.totalFiles} total files)`,
    '',
  );

  if (signals.vagueFileNames.length > 0) {
    sections.push(
      `- Vague file names found: ${signals.vagueFileNames.join(', ')}`,
      '  (AI cannot determine what belongs in files named "utils" or "helpers" — use descriptive names)',
      '',
    );
  }

  // Module B: Behavior patterns (git-based)
  sections.push(
    '## Module B: Behavior Patterns (from git history)',
    '',
    'Analyze these patterns to detect problematic habits:',
    '',
  );

  if (gitStats) {
    sections.push(
      '### Recent commit activity (last 50 commits with changed files)',
      '',
      '```',
      gitStats,
      '```',
      '',
      'Analyze for:',
      '- **Commit granularity**: Average files changed per commit. >10 files/commit = not doing incremental commits',
      '- **Hotspot files**: Any file modified in 5+ of the last 50 commits = likely patching instead of rewriting',
      '- **Revert patterns**: Multiple "revert" / "fix" / "oops" commits = not validating AI output before committing',
      '',
    );
  }

  if (commitMessages) {
    sections.push(
      '### Recent commit messages',
      '',
      '```',
      commitMessages,
      '```',
      '',
      'Analyze for:',
      '- **Message quality**: Are messages descriptive or just "fix" / "update" / "wip"?',
      '- **Pattern of rework**: Sequences like "add X" → "fix X" → "fix X again" = AI output not validated',
      '',
    );
  }

  if (!gitStats && !commitMessages) {
    sections.push(
      '(No git history available — cannot analyze behavior patterns)',
      '',
    );
  }

  // Module C: Knowledge blind spots
  sections.push(
    '## Module C: Knowledge Blind Spots',
    '',
    'What the user probably does not know they do not know.',
    '',
  );

  // Unbound SDK warning
  if (signals.unboundSdks.length > 0) {
    sections.push(
      '### UNPROTECTED SDKs — Domain Knowledge Risk',
      '',
      `The following SDK dependencies have **no doc binding** registered. AI may be guessing field names and configs:`,
      '',
      ...signals.unboundSdks.map(sdk => `- **${sdk}** — not bound to any documentation`),
      '',
      'Recommended actions:',
      '',
      '**Option A (fastest)**: If [Context7 MCP](https://github.com/upstash/context7) is installed, it can pull latest docs for 9000+ public libraries automatically:',
      '```',
      'resolve-library-id(libraryName: "<sdk-name>") → get-library-docs(context7CompatibleLibraryID: "...", topic: "...")',
      '```',
      'Save the output as a local markdown file, then bind it with Callout.',
      '',
      '**Option B (custom docs)**: If the SDK has private/internal documentation, or Context7 does not cover it:',
      '- If [Firecrawl MCP](https://github.com/mendableai/firecrawl-mcp-server) is installed, scrape the official docs: `firecrawl_scrape(url: "<docs-url>")`',
      '- Save the output to `docs/<sdk-name>-api.md`',
      '',
      '**Then bind with Callout**:',
      '```',
      `doc(action: "register", domain: "<sdk-name>", docs: ["docs/<sdk>-api.md"], scope: ["src/<relevant-path>/**"], rule: "Must read <SDK> docs before modifying this code")`,
      '```',
      '',
    );
  }

  // Dependencies analysis
  const deps = context.packageJson?.dependencies || {};
  const depNames = Object.keys(deps);
  if (depNames.length > 0) {
    sections.push(
      '### Core dependencies — has the user read the docs?',
      '',
      `This project uses ${depNames.length} dependencies: ${depNames.join(', ')}`,
      '',
      'For each CORE dependency (not utility libraries like lodash, but SDKs and frameworks that determine the architecture):',
      '1. Has the user likely read the full official documentation, or are they relying on AI knowledge (which may be outdated)?',
      '2. Is the project using only a small subset of the dependency\'s capabilities?',
      '3. Are there custom implementations that the dependency already supports natively?',
      '4. Is the project on the latest version? Are there breaking changes or new features the user might not know about?',
      '',
      '**Key warning**: AI-generated documentation summaries miss 30-50% of API capabilities. The user should paste raw official docs into AI rather than relying on AI to "know" the API.',
      '',
    );
  }

  // Stage-specific blind spots
  sections.push(
    `### Stage-specific blind spots (${stage} stage)`,
    '',
    `The project is in the **${stage}** stage. Based on this, identify:`,
    '- What questions should the user be asking but probably is not?',
    '- What decisions has AI likely made on behalf of the user without the user realizing?',
    '- What common mistakes do founders make at this stage when working with AI?',
    '',
  );

  // Todo health
  if (todoSummary) {
    sections.push(
      '## Todo Health',
      '',
      todoSummary,
      '',
      'Analyze: Are MUST items stagnating? Is the user making progress or going in circles?',
      '',
    );
  }

  // Output format
  sections.push(
    '---',
    '',
    '## Output Format',
    '',
    'Structure your response as "Things you might not know":',
    '',
    'For each finding:',
    '- **[MUST]** or **[SHOULD]** label',
    '- One sentence: what the user does not know',
    '- One sentence: why it matters / what it costs them',
    '- One sentence: exactly what to do about it (specific command, specific action)',
    '',
    'Start with the most impactful finding. Maximum 7 findings — quality over quantity.',
    '',
    'End with "What you are doing right" — 2-3 things the user should keep doing.',
    '',
    '---',
    '',
    '## After Coach: Add to Todo List',
    '',
    'Add each [MUST] finding to the project todo list using `todo_add` (priority: "must", source: "coach").',
    'Add each [SHOULD] finding with priority: "should".',
    'The user can re-run `coach` later to check improvement.',
  );

  return sections.join('\n');
}
