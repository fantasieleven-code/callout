import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { collectContext } from '../context.js';
import { buildReviewPrompt } from '../review.js';
import { RULES_TEMPLATE } from '../rules-template.js';
import { loadHistory, saveHistory } from '../history.js';
import { saveConfig } from '../config.js';
import { scanProjects, buildPortfolioPrompt } from '../portfolio.js';
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

## Core Tools

### review — "Get expert opinions on my project"
9 perspectives in 3 groups: Technical (CTO, Security, DevOps), Business (Product, Customer, Strategy), Founder (Investor, Unicorn Founder, Solo Entrepreneur). Use \`focus\` to zoom in, \`perspective_group\` to select a group.

**Try:**
- "Review this project" — full 9-perspective review
- "Review with founder group" — investor + unicorn founder + solo entrepreneur
- "Review focus: should I use Supabase or Firebase?" — technology decision
- "Review focus: user login page" — focused feature review
- "Review security + CTO only" — selected perspectives

### coach — "Am I working with AI the right way?"
Analyzes your project setup, development habits, and knowledge blind spots. Reveals what you don't know you're doing wrong when working with AI coding tools.

**Try:** "Coach me" / "How am I doing with AI?" / "Check my collaboration habits"

### test_translate — "What do my tests actually cover?"
Translates test results into plain language. Shows what's tested, what failed, and produces a manual test script.

**Try:** "Translate my test results" / "What do these tests mean?"

### idea_score — "Is this idea worth building?"
Scores your idea across 10 dimensions (market size, feasibility, moat, revenue, etc.) with a skeptical default stance. Returns a verdict: CONTINUE, SIMPLIFY, PAUSE, or DELETE.

**Try:** "Score this idea" / "Is this worth building?" / "Rate my project"

## Supporting Tools

### recommend — "What tools should I use for this?"
Detects what your project needs (auth, database, payments, etc.) and recommends the best tool.

**Try:** "What should I use for auth?" / "I need to add payments"

### Todo List — Your central command
All findings from review and coach flow into your todo list.
Tools: todo_add, todo_update, todo_list, todo_summary

**Try:** "Show my todos" / "What's my top priority?"

### portfolio — "What should I work on across all my projects?"
Scans all your projects, shows health status, and gives resource allocation advice.

**Try:** "Show my portfolio"

### Domain Knowledge Guard — "Make AI read docs before coding"
Binds documentation to code paths so AI must read docs before modifying protected files.
Tools: doc (register/remove/list/check), doc_gate, renovation

**Try:**
- "Register Stripe docs for payment code" — bind docs to code paths
- "Check if my RTC code matches the docs" — compliance verification
- "Start a renovation for volcano-rtc" — systematic domain knowledge audit

### Other: set_target_user, save_review_findings, recommend_dismiss, recommend_reset, init

---

## Works Best With (optional companion MCPs)

| MCP | What it adds to Callout | Install |
|-----|------------------------|---------|
| **Context7** | Auto-pulls latest docs for 9000+ public libraries — feed into \`doc register\` | \`claude mcp add context7 -- npx -y @upstash/context7-mcp\` |
| **Sequential Thinking** | Structured step-by-step reasoning for complex renovations and multi-perspective reviews | \`claude mcp add sequential-thinking -- npx -y @anthropic-ai/mcp-server-sequential-thinking\` |
| **Firecrawl** | Scrapes any web docs into markdown — bind with \`doc register\` | \`claude mcp add firecrawl -- npx -y firecrawl-mcp\` |

---

**Start here:** Say "Coach me" to check your AI collaboration setup, or "Review this project" for a full expert review.`,
        }],
      };
    },
  );

  server.tool(
    'init',
    'Initialize Callout in a project. Returns CLAUDE.md rules that enable automatic review/coach/recommend triggers. The host should append these rules to the project\'s CLAUDE.md file.',
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
        '> | "Coach me" | Reveals AI collaboration blind spots and habits to fix |',
        '> | "Review this project" | 6 expert perspectives find blind spots |',
        '> | "Review focus: should I use X?" | Focused review on a specific decision |',
        '> | "Recommend tools" | Suggests the best tool for auth, database, payments, etc. |',
        '> | "Show my todos" | Your central command for tracking all findings |',
        '>',
        '> Callout also triggers **automatically** — it will speak up before you create new files, add dependencies, or start new features.',
        '>',
        '> **Start now:** Say **"Coach me"** to check your AI collaboration setup.',
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

  server.tool(
    'portfolio',
    'Multi-project overview for founders managing multiple projects. Scans a directory for all projects, shows health status (todos, review history, risks), and asks AI to give resource allocation advice from a founder perspective.',
    {
      projects_root: z
        .string()
        .optional()
        .describe('Root directory containing project folders. Defaults to ~/Desktop. E.g. "/Users/alice/projects"'),
    },
    async ({ projects_root }) => {
      const root = projects_root || join(process.env.HOME || process.env.USERPROFILE || '', 'Desktop');
      const projects = scanProjects(root);
      const prompt = buildPortfolioPrompt(projects);

      return {
        content: [{
          type: 'text' as const,
          text: `> Scanning: \`${root}\`\n\n${prompt}`,
        }],
      };
    },
  );
}
