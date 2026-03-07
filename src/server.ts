#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { collectContext } from './context.js';
import { buildReviewPrompt } from './review.js';
import { buildChallengePrompt } from './challenge.js';
import { RULES_TEMPLATE } from './rules-template.js';
import { isGitRepo, getGitDiff, getRecentFiles } from './git.js';
import { buildHistoryContext, loadHistory, saveReview, saveHistory } from './history.js';
import { buildGuidePrompt } from './guide.js';
import { addTodo, updateTodo, loadTodos, formatTodoList, formatTodoSummary } from './todo.js';
import { buildSpotCheckPrompt } from './prompts/spot-check.js';
import { buildTestTranslatePrompt } from './prompts/test-translate.js';
import { buildCleanupPrompt } from './prompts/cleanup.js';
import { buildValidatePrompt } from './prompts/validate.js';
import { detectScenes, buildRecommendPrompt } from './prompts/recommend.js';
import { filterDismissed, dismissScene } from './recommend.js';
import type { Scene } from './prompts/recommend.js';
import type { Perspective } from './types.js';
import type { Priority, TodoStatus } from './todo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));

const server = new McpServer({
  name: 'callout',
  version: pkg.version,
});

function resolvePath(project_path?: string): string {
  return project_path || process.cwd();
}

function withPathHeader(prompt: string, cwd: string): string {
  return `> Scanning: \`${cwd}\`\n\n${prompt}`;
}

server.tool(
  'review',
  'Multi-perspective architecture review. Analyzes project structure, dependencies, and code to produce actionable findings from expert viewpoints (CTO, Security, Product, DevOps, Customer).',
  {
    perspectives: z
      .array(z.enum(['cto', 'security', 'product', 'devops', 'customer']))
      .optional()
      .describe('Which perspectives to include. Defaults to all five.'),
    customer_role: z
      .string()
      .optional()
      .describe('Description of target customer for the customer perspective. E.g. "a startup CTO evaluating CI tools"'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project to review. Defaults to current working directory.'),
  },
  async ({ perspectives, customer_role, project_path }) => {
    const cwd = resolvePath(project_path);

    try {
      const context = await collectContext(cwd);
      const selectedPerspectives = (perspectives as Perspective[] | undefined) || ['cto', 'security', 'product', 'devops', 'customer'];
      const prompt = buildReviewPrompt(
        context,
        selectedPerspectives,
        customer_role,
      );

      // Load previous review history for comparison
      const historyContext = buildHistoryContext(cwd);

      // Save this review to history
      saveReview(cwd, {
        date: new Date().toISOString().split('T')[0],
        perspectives: selectedPerspectives,
        findingSummary: '(findings will be filled by the AI after review execution)',
      });

      const fullPrompt = withPathHeader(
        historyContext ? prompt + '\n\n---\n\n' + historyContext : prompt,
        cwd,
      );

      return {
        content: [
          { type: 'text' as const, text: fullPrompt },
          {
            type: 'text' as const,
            text: `\n\n---\n\nAfter completing this review, please update the review history by calling the \`save_review_findings\` tool with a brief summary of your findings (e.g. "3 MUST FIX, 5 SHOULD FIX, 8 GOOD. Key issue: JWT missing orgId").`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error collecting project context: ${message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'challenge',
  'Product-level challenge of current work. Questions whether what you are building right now is worth doing. Use this before starting a new feature, when stuck on a bug for too long, or when you suspect scope creep.',
  {
    git_diff: z
      .string()
      .optional()
      .describe('Output of `git diff` or `git diff --staged`. If not provided, Callout will describe how to obtain it.'),
    recent_files: z
      .string()
      .optional()
      .describe('Output of `git log --oneline -10 --name-only`. Shows recently changed files.'),
    description: z
      .string()
      .optional()
      .describe('Brief description of what you are currently working on.'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ git_diff, recent_files, description, project_path }) => {
    const cwd = resolvePath(project_path);

    try {
      const context = await collectContext(cwd);

      // Auto-collect git info if not provided and project is a git repo
      let diff = git_diff || '';
      let files = recent_files || '';
      if (isGitRepo(cwd)) {
        if (!diff) diff = getGitDiff(cwd);
        if (!files) files = getRecentFiles(cwd);
      }

      const prompt = buildChallengePrompt(
        context,
        diff,
        files,
        description,
      );

      return {
        content: [{ type: 'text' as const, text: withPathHeader(prompt, cwd) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'callout_help',
  'Show what Callout can do and how to use it. Call this when a user first connects or asks about Callout.',
  {},
  async () => {
    return {
      content: [{
        type: 'text' as const,
        text: `# Callout — Your AI Co-founder for 0→1 Builds

## Tools Available

### guide — "What should I be thinking about right now?"
Detects your project stage (research → architecture → building → testing → launch) and shows the questions you should be asking but aren't.

**Try:** "Guide me" / "What should I focus on?"

### review — "Get 5 expert opinions on my project"
CTO, Security, Product, DevOps, and Customer perspectives. Finds what you didn't know to look for — from over-engineering to patent opportunities.

**Try:** "Review this project" / "Run a security + CTO review"

### challenge — "Is what I'm doing right now worth it?"
When you're stuck on a bug or feature, this asks the hard question: should you keep going, simplify, or delete it?

**Try:** "Challenge what I'm working on" / "This bug is taking forever, should I keep going?"

### spot_check — "Quick security scan of this code"
Flags dangerous issues in AI-generated code: vulnerabilities, logic errors, unsafe operations.

**Try:** "Spot check this file" / "Scan auth.ts for security issues"

### test_translate — "What do my tests actually cover?"
Translates test results into plain language. Shows what's tested, what failed, and produces a manual test script.

**Try:** "Translate my test results" / "What do these tests mean?"

### cleanup — "What can I delete or simplify?"
Finds dead code, duplicate logic, unused dependencies, and over-engineering. Returns specific delete/merge/simplify actions.

**Try:** "Clean up this project" / "Find dead code"

### validate — "Should I use X or Y?"
Validates technology decisions in context. Gives a direct verdict with reasoning and confidence level.

**Try:** "Should I use Supabase or Planetscale?" / "Is Redis worth adding now?"

### recommend — "What tools should I use for this?"
Detects what your project needs (auth, database, payments, deployment, etc.) and recommends the best tool for each scenario. Considers your existing dependencies and current task. Same scenario is only recommended once.

**Try:** "Recommend tools" / "What should I use for auth?" / "I need to add payments"

### save_review_findings — Save review results
After a review, saves findings summary to history for progress tracking across reviews.

### Todo List — Your central command
All findings from guide, review, and challenge flow into your todo list. Track what's found, what's fixed, what's pending.
Tools: todo_add, todo_update, todo_list, todo_summary

**Try:** "Show my todos" / "What's my top priority?" / "Mark todo #3 as done"

### init — One-time setup
Sets up auto-triggers so Callout speaks up automatically during development.

**Try:** "Initialize Callout in this project"

---

**Start here:** Say "Guide me" to see what stage your project is in and what to focus on.`,
      }],
    };
  },
);

server.tool(
  'init',
  'Initialize Callout in a project. Returns CLAUDE.md rules that enable automatic challenge/review triggers. The host should append these rules to the project\'s CLAUDE.md file.',
  {
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ project_path }) => {
    const cwd = resolvePath(project_path);

    // Also run a quick CTO review so the user sees value immediately
    let quickReview = '';
    try {
      const context = await collectContext(cwd);
      quickReview = buildReviewPrompt(context, ['cto']);
    } catch {
      // If context collection fails, just skip the quick review
    }

    const parts = [
      `Please append the following rules to the project's rule file in \`${cwd}\`.`,
      '',
      'Write to the appropriate file based on the current coding tool:',
      '- Claude Code → CLAUDE.md',
      '- Cursor → .cursorrules',
      '- Windsurf → .windsurfrules',
      '- GitHub Copilot → .github/copilot-instructions.md',
      '',
      'If the file does not exist, create it.',
      '',
      '---',
      '',
      RULES_TEMPLATE,
    ];

    parts.push(
      '',
      '---',
      '',
      '## Getting Started with Callout',
      '',
      'After writing the rules above, show the user this quick-start guide:',
      '',
      '> **Callout is set up!** Here\'s what you can say to me now:',
      '>',
      '> | Say this | What happens |',
      '> |----------|-------------|',
      '> | "Guide me" | Detects your project stage and shows what to focus on |',
      '> | "Review this project" | 5 expert perspectives find blind spots |',
      '> | "Challenge what I\'m working on" | Questions whether current work is worth doing |',
      '> | "Recommend tools" | Suggests the best tool for auth, database, payments, etc. |',
      '> | "Should I use X or Y?" | Validates technology decisions |',
      '> | "Spot check this file" | Quick security scan of AI-generated code |',
      '> | "Clean up this project" | Finds dead code and over-engineering |',
      '> | "Show my todos" | Your central command for tracking all findings |',
      '>',
      '> Callout also triggers **automatically** — it will speak up before you create new files, add dependencies, or start new features.',
      '>',
      '> **Start now:** Say **"Guide me"** to see what stage your project is in.',
    );

    if (quickReview) {
      parts.push(
        '',
        '---',
        '',
        '## Quick CTO Review (first taste of Callout)',
        '',
        'Now that Callout is initialized, here is a quick CTO-perspective review of the project.',
        'Please execute this review and show the results to the user:',
        '',
        quickReview,
      );
    }

    return {
      content: [{
        type: 'text' as const,
        text: parts.join('\n'),
      }],
    };
  },
);

server.tool(
  'save_review_findings',
  'Save a summary of review findings to the project history. Call this after completing a review to enable progress tracking across reviews.',
  {
    summary: z
      .string()
      .describe('Brief summary of findings, e.g. "3 MUST FIX, 5 SHOULD FIX, 8 GOOD. Key: JWT missing orgId, role system over-engineered"'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ summary, project_path }) => {
    const cwd = resolvePath(project_path);

    try {
      // Update the most recent review record with actual findings
      const history = loadHistory(cwd);

      if (history.reviews.length > 0) {
        history.reviews[history.reviews.length - 1].findingSummary = summary;
        saveHistory(cwd, history);
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Review findings saved. ${history.reviews.length} review(s) in history. Next review will compare against these findings.`,
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error saving findings: ${message}` }],
        isError: true,
      };
    }
  },
);

// --- Guide tool ---

server.tool(
  'guide',
  'Detect project stage and show what questions you should be asking right now. Proactively surfaces blind spots based on lessons from real 0→1 builds.',
  {
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ project_path }) => {
    const cwd = resolvePath(project_path);

    try {
      const context = await collectContext(cwd);
      const prompt = buildGuidePrompt(context);

      return {
        content: [{ type: 'text' as const, text: withPathHeader(prompt, cwd) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// --- Todo tools ---

server.tool(
  'todo_add',
  'Add an item to the project todo list. All findings from review, challenge, and guide should be added here.',
  {
    title: z.string().describe('Short title of the todo item'),
    description: z.string().optional().describe('Detailed description'),
    priority: z.enum(['must', 'should', 'nice']).describe('Priority: must = blocks launch, should = important improvement, nice = when you have time'),
    source: z.string().optional().describe('Where this item came from (e.g. "CTO review", "Security review", "guide", "user")'),
    project_path: z.string().optional(),
  },
  async ({ title, description, priority, source, project_path }) => {
    const cwd = resolvePath(project_path);
    const item = addTodo(cwd, title, description || '', priority, source || 'user');

    return {
      content: [{
        type: 'text' as const,
        text: `Added todo #${item.id}: [${priority.toUpperCase()}] ${title}`,
      }],
    };
  },
);

server.tool(
  'todo_update',
  'Update a todo item status or details.',
  {
    id: z.number().describe('Todo item ID'),
    status: z.enum(['open', 'in_progress', 'done', 'wont_do']).optional().describe('New status'),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['must', 'should', 'nice']).optional(),
    project_path: z.string().optional(),
  },
  async ({ id, status, title, description, priority, project_path }) => {
    const cwd = resolvePath(project_path);
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (priority) updates.priority = priority;

    const item = updateTodo(cwd, id, updates as { status?: TodoStatus; title?: string; description?: string; priority?: Priority });

    if (!item) {
      return {
        content: [{ type: 'text' as const, text: `Todo #${id} not found.` }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: `Updated todo #${id}: [${item.priority.toUpperCase()}] ${item.title} → ${item.status}`,
      }],
    };
  },
);

server.tool(
  'todo_list',
  'Show all todo items, optionally filtered by status or priority.',
  {
    status: z.enum(['open', 'in_progress', 'done', 'wont_do']).optional().describe('Filter by status'),
    priority: z.enum(['must', 'should', 'nice']).optional().describe('Filter by priority'),
    project_path: z.string().optional(),
  },
  async ({ status, priority, project_path }) => {
    const cwd = resolvePath(project_path);
    const todos = loadTodos(cwd);

    return {
      content: [{
        type: 'text' as const,
        text: formatTodoList(todos, {
          status: status as TodoStatus | undefined,
          priority: priority as Priority | undefined,
        }),
      }],
    };
  },
);

server.tool(
  'todo_summary',
  'Quick health check: how many items open, in progress, done. Shows top priority items.',
  {
    project_path: z.string().optional(),
  },
  async ({ project_path }) => {
    const cwd = resolvePath(project_path);

    return {
      content: [{
        type: 'text' as const,
        text: formatTodoSummary(cwd),
      }],
    };
  },
);

// --- spot_check tool ---

server.tool(
  'spot_check',
  'Quick security scan of AI-generated code. Flags only dangerous issues (vulnerabilities, logic errors, unsafe operations). Fast — meant to be run immediately after AI generates code.',
  {
    code: z
      .string()
      .optional()
      .describe('Code to review. Paste directly or use file_path instead.'),
    file_path: z
      .string()
      .optional()
      .describe('Path to file to review. Used if code is not provided directly. Must be within project_path.'),
    filename: z
      .string()
      .optional()
      .describe('Filename hint for context (e.g. "auth.ts"). Auto-detected from file_path if not provided.'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Used to validate file_path is within the project.'),
  },
  async ({ code, file_path, filename, project_path }) => {
    let codeContent = code || '';
    let resolvedFilename = filename;

    if (!codeContent && file_path) {
      // Always validate file_path is within project boundary
      const cwd = resolvePath(project_path);
      const resolvedFile = resolve(file_path);
      const resolvedProject = resolve(cwd);
      if (!resolvedFile.startsWith(resolvedProject + '/') && resolvedFile !== resolvedProject) {
        return {
          content: [{ type: 'text' as const, text: `Error: file_path must be within project_path. Got "${file_path}" outside "${resolvedProject}".` }],
          isError: true,
        };
      }
      try {
        const { basename } = await import('node:path');
        const { statSync } = await import('node:fs');
        const fileSize = statSync(file_path).size;
        if (fileSize > 1_000_000) {
          return {
            content: [{ type: 'text' as const, text: `Error: file is too large (${(fileSize / 1_000_000).toFixed(1)}MB). spot_check supports files up to 1MB.` }],
            isError: true,
          };
        }
        codeContent = readFileSync(file_path, 'utf-8');
        if (!resolvedFilename) resolvedFilename = basename(file_path);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error reading file: ${message}` }],
          isError: true,
        };
      }
    }

    if (!codeContent.trim()) {
      return {
        content: [{ type: 'text' as const, text: 'Provide either code or file_path to scan.' }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text' as const, text: buildSpotCheckPrompt(codeContent, resolvedFilename) }],
    };
  },
);

// --- test_translate tool ---

server.tool(
  'test_translate',
  'Translate test results into plain language. Tells a non-technical founder what the tests cover, what failed, and exactly what still needs manual verification. Produces a 15-minute manual test script.',
  {
    test_output: z
      .string()
      .optional()
      .describe('Paste the test runner output here. If not provided, Callout will ask you to run tests and paste the result.'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Used to collect context. Defaults to current working directory.'),
  },
  async ({ test_output, project_path }) => {
    const cwd = resolvePath(project_path);

    if (!test_output) {
      return {
        content: [{
          type: 'text' as const,
          text: `Please run your test suite and paste the output here.\n\nCommon commands:\n- \`npm test\`\n- \`npx vitest run\`\n- \`pytest\`\n- \`go test ./...\`\n\nThen call test_translate again with the test_output parameter.`,
        }],
      };
    }

    try {
      const context = await collectContext(cwd);
      return {
        content: [{ type: 'text' as const, text: withPathHeader(buildTestTranslatePrompt(test_output, context), cwd) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// --- cleanup tool ---

server.tool(
  'cleanup',
  'Scan the project for dead code, duplicate logic, unused dependencies, and over-engineering. Returns specific actions: what to delete, what to merge, and what to simplify.',
  {
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ project_path }) => {
    const cwd = resolvePath(project_path);

    try {
      const context = await collectContext(cwd);
      return {
        content: [{ type: 'text' as const, text: withPathHeader(buildCleanupPrompt(context), cwd) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// --- validate tool ---

server.tool(
  'validate',
  'Validate a technology decision in the context of your project. Ask "Should I use X or Y?" or "Is Supabase the right choice?". Returns a direct verdict, reasoning, confidence level, and what could change the answer.',
  {
    question: z
      .string()
      .describe('Your decision question. E.g. "Should I use Supabase or Planetscale?" or "Is it worth adding Redis for caching now?"'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ question, project_path }) => {
    const cwd = resolvePath(project_path);

    try {
      const context = await collectContext(cwd);
      return {
        content: [{ type: 'text' as const, text: withPathHeader(buildValidatePrompt(question, context), cwd) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// --- recommend tool ---

server.tool(
  'recommend',
  'Detect what the project needs and recommend the best tool/service for each scenario. Recommends auth, database, payments, deployment tools etc. based on current task and existing dependencies. Same scenario is not recommended twice.',
  {
    task: z
      .string()
      .optional()
      .describe('What the user is currently working on or about to build. E.g. "add user login" or "set up payments".'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ task, project_path }) => {
    const cwd = resolvePath(project_path);

    try {
      const context = await collectContext(cwd);
      const allScenes = detectScenes(context, task);
      const scenes = filterDismissed(cwd, allScenes);

      if (scenes.length === 0) {
        const msg = allScenes.length > 0
          ? `All detected scenarios (${allScenes.join(', ')}) have already been recommended. No new recommendations.`
          : 'No tool recommendation scenarios detected for the current task and project state.';
        return {
          content: [{ type: 'text' as const, text: msg }],
        };
      }

      const prompt = buildRecommendPrompt(context, scenes, task);
      const sceneList = scenes.map((s) => `"${s}"`).join(', ');

      return {
        content: [
          { type: 'text' as const, text: withPathHeader(prompt, cwd) },
          {
            type: 'text' as const,
            text: `\n\n---\n\nAfter the user has seen these recommendations, call \`recommend_dismiss\` for each scenario to avoid repeating: ${sceneList}. If the user says they don't need a particular recommendation, dismiss that scenario too.`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'recommend_dismiss',
  'Dismiss a recommendation scenario so it won\'t be suggested again. Use when the user says they don\'t need a recommendation for a particular area.',
  {
    scene: z
      .string()
      .describe('The scenario to dismiss. E.g. "auth", "database", "payments".'),
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ scene, project_path }) => {
    const cwd = resolvePath(project_path);
    dismissScene(cwd, scene as Scene);

    return {
      content: [{
        type: 'text' as const,
        text: `Dismissed "${scene}" — this scenario won't be recommended again for this project.`,
      }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Callout server failed to start:', error);
  process.exit(1);
});
