import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { collectContext } from '../context.js';
import { buildReviewPrompt } from '../review.js';
import { RULES_TEMPLATE } from '../rules-template.js';
import { loadHistory, saveHistory } from '../history.js';
import { saveConfig } from '../config.js';
import { resolvePath } from '../util.js';

export function registerMetaTools(server: McpServer): void {
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

If a recommendation was dismissed by mistake, say "Reset recommendations" to re-enable all scenarios.

### save_review_findings — Save review results
After a review, saves findings summary to history for progress tracking across reviews.

### Todo List — Your central command
All findings from guide, review, and challenge flow into your todo list. Track what's found, what's fixed, what's pending.
Tools: todo_add, todo_update, todo_list, todo_summary

**Try:** "Show my todos" / "What's my top priority?" / "Mark todo #3 as done"

### set_target_user — Set who your target user is
Tell Callout who uses your product (e.g. "enterprise HR managers"). All future reviews with customer perspective will evaluate from their point of view. Auto-detected from README if not set.

**Try:** "Set target user to startup CTOs" / "My users are non-technical founders"

### recommend_reset — Re-enable dismissed recommendations
If recommendations were dismissed by mistake, reset them so recommend detects those scenarios again.

**Try:** "Reset recommendations"

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

  server.tool(
    'set_target_user',
    'Set who the target user of this project is. This is used by the customer perspective in reviews to give feedback as that specific type of user. Auto-detected from README/CLAUDE.md if not set manually.',
    {
      target_user: z
        .string()
        .describe('Description of the target user. E.g. "non-technical founder using AI to build SaaS", "enterprise HR manager evaluating compliance tools", "indie developer looking for deployment solutions"'),
      project_path: z
        .string()
        .optional()
        .describe('Path to the project. Defaults to current working directory.'),
    },
    async ({ target_user, project_path }) => {
      const cwd = resolvePath(project_path);
      saveConfig(cwd, { target_user });

      return {
        content: [{
          type: 'text' as const,
          text: `Target user set to: "${target_user}". All future reviews with customer perspective will evaluate the product as this user.`,
        }],
      };
    },
  );
}
