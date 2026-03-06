# Archon

**You used AI to write code for 3 days. Archon tells you 60% of it was over-engineered.**

AI coding tools make you 10x faster. But nobody checks if you're building the right thing. Archon is the second pair of eyes — 5 expert perspectives that catch what you miss.

## 30-second setup

```bash
npm install -g archon-dev
npx archon-dev setup
```

That's it. Archon auto-configures your editor (Claude Code / Cursor / VS Code) and sets up smart triggers. You'll get a quick CTO review of your project immediately.

## What it does

### `review` — "Am I building this right?"

5 expert perspectives audit your codebase:

| Perspective | What it catches |
|-------------|----------------|
| **CTO** | "Your 4-level role system only needs 2 levels. Cut it, save 3 days." |
| **Security** | "JWT missing orgId — multi-tenant data can leak across tenants." |
| **Product** | "HR managers won't self-register. Replace with invite-only flow." |
| **DevOps** | "Billing doesn't need a DB table. A config object saves 1 day." |
| **Customer** | "No compliance page = enterprise customers won't even evaluate you." |

```
> Review this project
> Run a security + CTO review
> Review from the perspective of an HR manager evaluating this tool
```

### `challenge` — "Should I be building this at all?"

When you've been fixing the same bug for an hour, Archon asks the hard question: is this feature even worth keeping?

Checks ROI, sunk cost, complexity budget, scope creep. Returns a verdict:
- **CONTINUE** — keep going, this is valuable
- **SIMPLIFY** — right goal, over-engineered approach
- **PAUSE** — validate the need before writing more code
- **DELETE** — negative ROI, remove it

```
> Challenge what I'm working on
> I've been on this RTC bug for an hour, is it worth it?
```

Git diff and recent changes are collected automatically — zero effort from you.

### Smart auto-triggers

After setup, Archon speaks up automatically when it matters:

- Editing the same file for the 3rd time → "Are you chasing a bug in a low-value feature?"
- Creating a new file → "Is this new module necessary?"
- Bug fix exceeding 30 minutes → "Should this feature be simplified or removed?"
- Adding a new dependency → "Is there a simpler alternative?"
- Completing a milestone → Full 5-perspective review

You don't need to remember to call it. It interrupts you when it should.

## How it works

Archon is an [MCP](https://modelcontextprotocol.io) server. It collects your project context (file structure, dependencies, README, CLAUDE.md, git history) and assembles expert-perspective prompts. Your AI tool (Claude, Cursor, etc.) executes the review.

One server, works everywhere:
- **Claude Code**: `.mcp.json`
- **Cursor**: `.cursor/mcp.json`
- **VS Code**: `.vscode/mcp.json`
- **Windsurf**: `~/.codeium/windsurf/mcp_config.json`

## Output format

Every finding is categorized:

- **MUST FIX** — critical issues blocking production
- **SHOULD FIX** — improvements with clear ROI
- **GOOD** — confirmed correct decisions

Starts with an Executive Summary so you know what to focus on in 30 seconds.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).

For commercial licensing, contact the author.
