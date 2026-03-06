#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { collectContext } from './context.js';
import { buildReviewPrompt } from './review.js';
import { buildChallengePrompt } from './challenge.js';
import { RULES_TEMPLATE } from './rules-template.js';
import type { Perspective } from './types.js';

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
      const prompt = buildReviewPrompt(
        context,
        perspectives as Perspective[] | undefined,
        customer_role,
      );

      return {
        content: [{ type: 'text' as const, text: prompt }],
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
      const prompt = buildChallengePrompt(
        context,
        git_diff || '',
        recent_files || '',
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

    return {
      content: [{
        type: 'text' as const,
        text: [
          `Please append the following rules to the CLAUDE.md file in \`${cwd}\`.`,
          'If CLAUDE.md does not exist, create it.',
          '',
          '---',
          '',
          RULES_TEMPLATE,
        ].join('\n'),
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
