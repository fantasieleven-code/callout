import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { collectContext } from '../context.js';
import { buildReviewPrompt } from '../review.js';
import { buildChallengePrompt } from '../challenge.js';
import { buildGuidePrompt } from '../guide.js';
import { buildSpotCheckPrompt } from '../prompts/spot-check.js';
import { buildTestTranslatePrompt } from '../prompts/test-translate.js';
import { buildCleanupPrompt } from '../prompts/cleanup.js';
import { buildValidatePrompt } from '../prompts/validate.js';
import { isGitRepo, getGitDiff, getRecentFiles } from '../git.js';
import { buildHistoryContext, saveReview } from '../history.js';
import { getTargetUser } from '../config.js';
import { resolvePath, withPathHeader } from '../util.js';
import type { Perspective } from '../types.js';

export function registerAnalysisTools(server: McpServer): void {
  server.tool(
    'review',
    'Multi-perspective architecture review. Analyzes full project context and produces actionable findings from expert viewpoints. Use focus parameter to zoom in on a specific feature, page, or decision while keeping full project context.',
    {
      perspectives: z
        .array(z.enum(['cto', 'security', 'product', 'devops', 'customer', 'strategy']))
        .optional()
        .describe('Which perspectives to include. Defaults to all six.'),
      focus: z
        .string()
        .optional()
        .describe('Specific feature, page, module, or decision to focus the review on. E.g. "user login page", "payment integration", "the API rate limiting approach". The full project is still scanned for context, but findings focus on this area.'),
      customer_role: z
        .string()
        .optional()
        .describe('Description of target customer for the customer perspective. E.g. "a startup CTO evaluating CI tools"'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project to review. Defaults to current working directory.'),
    },
    async ({ perspectives, focus, customer_role, project_path }) => {
      const cwd = resolvePath(project_path);

      try {
        const context = await collectContext(cwd);
        const selectedPerspectives = (perspectives as Perspective[] | undefined) || ['cto', 'security', 'product', 'devops', 'customer', 'strategy'];

        let resolvedCustomerRole = customer_role;
        if (!resolvedCustomerRole && selectedPerspectives.includes('customer')) {
          const detectedUser = getTargetUser(cwd, context);
          if (detectedUser) {
            resolvedCustomerRole = detectedUser;
          }
        }

        const prompt = buildReviewPrompt(
          context,
          selectedPerspectives,
          resolvedCustomerRole,
          focus,
        );

        const historyContext = buildHistoryContext(cwd);

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
      git_diff: z.string().optional().describe('Output of `git diff` or `git diff --staged`. If not provided, Callout will describe how to obtain it.'),
      recent_files: z.string().optional().describe('Output of `git log --oneline -10 --name-only`. Shows recently changed files.'),
      description: z.string().optional().describe('Brief description of what you are currently working on.'),
      project_path: z.string().optional().describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ git_diff, recent_files, description, project_path }) => {
      const cwd = resolvePath(project_path);

      try {
        const context = await collectContext(cwd);

        let diff = git_diff || '';
        let files = recent_files || '';
        if (isGitRepo(cwd)) {
          if (!diff) diff = getGitDiff(cwd);
          if (!files) files = getRecentFiles(cwd);
        }

        const prompt = buildChallengePrompt(context, diff, files, description);

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
    'guide',
    'Detect project stage and show what questions you should be asking right now. Proactively surfaces blind spots based on lessons from real 0→1 builds.',
    {
      project_path: z.string().optional().describe('Path to the project. Defaults to current working directory.'),
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

  server.tool(
    'spot_check',
    'Quick security scan of AI-generated code. Flags only dangerous issues (vulnerabilities, logic errors, unsafe operations). Fast — meant to be run immediately after AI generates code.',
    {
      code: z.string().optional().describe('Code to review. Paste directly or use file_path instead.'),
      file_path: z.string().optional().describe('Path to file to review. Used if code is not provided directly. Must be within project_path.'),
      filename: z.string().optional().describe('Filename hint for context (e.g. "auth.ts"). Auto-detected from file_path if not provided.'),
      project_path: z.string().optional().describe('Path to the project. Used to validate file_path is within the project.'),
    },
    async ({ code, file_path, filename, project_path }) => {
      let codeContent = code || '';
      let resolvedFilename = filename;

      if (!codeContent && file_path) {
        const cwd = resolvePath(project_path);
        let resolvedFile: string;
        let resolvedProject: string;
        try {
          resolvedFile = realpathSync(resolve(file_path));
          resolvedProject = realpathSync(resolve(cwd));
        } catch {
          resolvedFile = resolve(file_path);
          resolvedProject = resolve(cwd);
        }
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

  server.tool(
    'test_translate',
    'Translate test results into plain language. Tells a non-technical founder what the tests cover, what failed, and exactly what still needs manual verification. Produces a 15-minute manual test script.',
    {
      test_output: z.string().optional().describe('Paste the test runner output here. If not provided, Callout will ask you to run tests and paste the result.'),
      project_path: z.string().optional().describe('Path to the project. Used to collect context. Defaults to current working directory.'),
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

  server.tool(
    'cleanup',
    'Scan the project for dead code, duplicate logic, unused dependencies, and over-engineering. Returns specific actions: what to delete, what to merge, and what to simplify.',
    {
      project_path: z.string().optional().describe('Path to the project. Defaults to current working directory.'),
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

  server.tool(
    'validate',
    'Validate a technology decision in the context of your project. Ask "Should I use X or Y?" or "Is Supabase the right choice?". Returns a direct verdict, reasoning, confidence level, and what could change the answer.',
    {
      question: z.string().describe('Your decision question. E.g. "Should I use Supabase or Planetscale?" or "Is it worth adding Redis for caching now?"'),
      project_path: z.string().optional().describe('Path to the project. Defaults to current working directory.'),
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
}
