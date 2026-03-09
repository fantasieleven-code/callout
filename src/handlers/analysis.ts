import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { collectContext } from '../context.js';
import { buildReviewPrompt } from '../review.js';
import { buildTestTranslatePrompt } from '../prompts/test-translate.js';
import { isGitRepo, getCommitStats, getCommitMessages } from '../git.js';
import { buildHistoryContext, saveReview, loadHistory } from '../history.js';
import { getTargetUser } from '../config.js';
import { resolvePath, withPathHeader } from '../util.js';
import type { Perspective, PerspectiveGroup } from '../types.js';
import { PERSPECTIVE_GROUPS } from '../types.js';
import { buildIdeaScorePrompt } from '../prompts/idea-score.js';
import { collectCoachSignals, buildCoachPrompt } from '../coach.js';
import { detectStage } from '../guide.js';
import { formatTodoSummary } from '../todo.js';

export function registerAnalysisTools(server: McpServer): void {
  server.tool(
    'review',
    'Multi-perspective architecture review. Analyzes full project context and produces actionable findings from expert viewpoints. Use focus parameter to zoom in on a specific feature, page, or decision. Use perspective_group to select a predefined group (technical/business/founder) instead of listing individual perspectives.',
    {
      perspectives: z
        .array(z.enum(['cto', 'security', 'product', 'devops', 'customer', 'strategy', 'investor', 'unicorn_founder', 'solo_entrepreneur']))
        .optional()
        .describe('Which perspectives to include. Defaults to all nine. Overrides perspective_group if both are provided.'),
      perspective_group: z
        .enum(['technical', 'business', 'founder'])
        .optional()
        .describe('Select a predefined group: technical (cto+security+devops), business (product+customer+strategy), founder (investor+unicorn_founder+solo_entrepreneur). Ignored if perspectives is specified.'),
      focus: z
        .string()
        .optional()
        .describe('Specific feature, page, module, or decision to focus the review on. E.g. "user login page", "payment integration", "should I use Supabase or Firebase", "what can I delete or simplify". The full project is still scanned for context, but findings focus on this area.'),
      customer_role: z
        .string()
        .optional()
        .describe('Description of target customer for the customer perspective. E.g. "a startup CTO evaluating CI tools"'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project to review. Defaults to current working directory.'),
    },
    async ({ perspectives, perspective_group, focus, customer_role, project_path }) => {
      const cwd = resolvePath(project_path);

      try {
        const context = await collectContext(cwd);
        let selectedPerspectives: Perspective[];
        if (perspectives && perspectives.length > 0) {
          selectedPerspectives = perspectives as Perspective[];
        } else if (perspective_group) {
          selectedPerspectives = PERSPECTIVE_GROUPS[perspective_group as PerspectiveGroup];
        } else {
          selectedPerspectives = ['cto', 'security', 'product', 'devops', 'customer', 'strategy', 'investor', 'unicorn_founder', 'solo_entrepreneur'];
        }

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
    'coach',
    'AI collaboration coach. Analyzes your project setup, development habits, and knowledge blind spots to reveal what you don\'t know you\'re doing wrong when working with AI coding tools. Does NOT review code quality (use review for that) — instead reviews YOUR behavior patterns.',
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
        const signals = collectCoachSignals(cwd, context);
        const stage = detectStage(context);

        let gitStatsOutput = '';
        let commitMsgs = '';
        if (isGitRepo(cwd)) {
          gitStatsOutput = getCommitStats(cwd);
          commitMsgs = getCommitMessages(cwd);
        }

        const todoSummary = formatTodoSummary(cwd);
        const history = loadHistory(cwd);
        const reviewCount = history.reviews.length;
        const lastReviewDate = reviewCount > 0
          ? history.reviews[history.reviews.length - 1].date
          : null;

        const prompt = buildCoachPrompt(
          context,
          signals,
          gitStatsOutput,
          commitMsgs,
          todoSummary,
          reviewCount,
          lastReviewDate,
          stage,
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
    'idea_score',
    'Score your idea across 10 dimensions with a skeptical default stance. Produces quantitative scores (1-10) for market size, feasibility, moat, revenue, time-to-market, user validation, resource efficiency, scalability, founder fit, and risk/reward. Returns a verdict: CONTINUE, SIMPLIFY, PAUSE, or DELETE.',
    {
      idea_description: z
        .string()
        .optional()
        .describe('Describe the idea to score. If not provided, Callout infers from README and project context.'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ idea_description, project_path }) => {
      const cwd = resolvePath(project_path);
      try {
        const context = await collectContext(cwd);
        const prompt = buildIdeaScorePrompt(context, idea_description);
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
}
