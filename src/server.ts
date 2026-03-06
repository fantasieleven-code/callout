#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { collectContext } from './context.js';
import { buildReviewPrompt } from './review.js';
import { buildChallengePrompt } from './challenge.js';
import { RULES_TEMPLATE } from './rules-template.js';
import { isGitRepo, getGitDiff, getRecentFiles } from './git.js';
import { buildHistoryContext, saveReview } from './history.js';
import { buildGuidePrompt } from './guide.js';
import { addTodo, updateTodo, loadTodos, formatTodoList, formatTodoSummary } from './todo.js';
import type { Perspective } from './types.js';
import type { Priority, TodoStatus } from './todo.js';

const server = new McpServer({
  name: 'archon',
  version: '0.1.0',
});

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
    const cwd = project_path || process.cwd();

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

      const fullPrompt = historyContext
        ? prompt + '\n\n---\n\n' + historyContext
        : prompt;

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
      .describe('Output of `git diff` or `git diff --staged`. If not provided, Archon will describe how to obtain it.'),
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
    const cwd = project_path || process.cwd();

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
        content: [{ type: 'text' as const, text: prompt }],
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
  'archon_help',
  'Show what Archon can do and how to use it. Call this when a user first connects or asks about Archon.',
  {},
  async () => {
    return {
      content: [{
        type: 'text' as const,
        text: `# Archon — Your AI Co-founder for 0→1 Builds

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

### Todo List — Your central command
All findings from guide, review, and challenge flow into your todo list. Track what's found, what's fixed, what's pending.

**Try:** "Show my todos" / "What's my top priority?" / "Mark todo #3 as done"

### init — One-time setup
Sets up auto-triggers so Archon speaks up automatically during development.

**Try:** "Initialize Archon in this project"

---

**Start here:** Say "Guide me" to see what stage your project is in and what to focus on.`,
      }],
    };
  },
);

server.tool(
  'init',
  'Initialize Archon in a project. Returns CLAUDE.md rules that enable automatic challenge/review triggers. The host should append these rules to the project\'s CLAUDE.md file.',
  {
    project_path: z
      .string()
      .optional()
      .describe('Path to the project. Defaults to current working directory.'),
  },
  async ({ project_path }) => {
    const cwd = project_path || process.cwd();

    // Also run a quick CTO review so the user sees value immediately
    let quickReview = '';
    try {
      const context = await collectContext(cwd);
      quickReview = buildReviewPrompt(context, ['cto']);
    } catch {
      // If context collection fails, just skip the quick review
    }

    const parts = [
      `Please append the following rules to the CLAUDE.md file in \`${cwd}\`.`,
      'If CLAUDE.md does not exist, create it.',
      '',
      '---',
      '',
      RULES_TEMPLATE,
    ];

    if (quickReview) {
      parts.push(
        '',
        '---',
        '',
        '## Quick CTO Review (first taste of Archon)',
        '',
        'Now that Archon is initialized, here is a quick CTO-perspective review of the project.',
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
    const cwd = project_path || process.cwd();

    try {
      // Update the most recent review record with actual findings
      const { loadHistory } = await import('./history.js');
      const history = loadHistory(cwd);

      if (history.reviews.length > 0) {
        history.reviews[history.reviews.length - 1].findingSummary = summary;

        const { writeFileSync, mkdirSync, existsSync } = await import('node:fs');
        const { join } = await import('node:path');
        const dir = join(cwd, '.archon');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'history.json'), JSON.stringify(history, null, 2) + '\n');
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
    const cwd = project_path || process.cwd();

    try {
      const context = await collectContext(cwd);
      const prompt = buildGuidePrompt(context);

      return {
        content: [{ type: 'text' as const, text: prompt }],
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
    const cwd = project_path || process.cwd();
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
    const cwd = project_path || process.cwd();
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
    const cwd = project_path || process.cwd();
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
    const cwd = project_path || process.cwd();

    return {
      content: [{
        type: 'text' as const,
        text: formatTodoSummary(cwd),
      }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Archon server failed to start:', error);
  process.exit(1);
});
