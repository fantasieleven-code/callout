# Archon

[![npm version](https://img.shields.io/npm/v/archon-dev)](https://www.npmjs.com/package/archon-dev)
[![npm downloads](https://img.shields.io/npm/dm/archon-dev)](https://www.npmjs.com/package/archon-dev)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Tests](https://img.shields.io/badge/tests-40%20passing-brightgreen)](https://github.com/fantasieleven-code/Archon)

**You used AI to write code for 3 days. Archon tells you 60% of it was over-engineered.**

AI coding tools make you 10x faster at writing code. Nobody checks if you're building the *right* thing. Archon is the second pair of eyes — 5 expert perspectives that catch what you miss, delivered as an MCP server that works inside Claude Code, Cursor, VS Code, and Windsurf.

---

## Why Archon exists

A real product was built using Claude Code in 6 days: 186 files, 691 tests. A multi-perspective review on Day 5 found that 60% was over-engineered. 9 days of planned work reduced to 3.5 days. The key insight: **the problem wasn't bad code — it was wrong priorities and missed blind spots**.

Archon makes that review available to every developer, automatically.

---

## 30-second setup

```bash
npx archon-dev setup
```

That's it. Archon auto-configures your editor and sets up smart triggers. You'll get a quick CTO review of your project immediately.

---

## What it does

### `review` — Five expert perspectives on your project

| Perspective | What it catches |
|-------------|----------------|
| **CTO** | "Your 4-level role system only needs 2 levels. Cut it, save 3 days." |
| **Security** | "JWT missing orgId — multi-tenant data can leak across tenants." |
| **Product** | "HR managers won't self-register. Replace with invite-only flow." |
| **DevOps** | "Billing doesn't need a DB table. A config object saves 1 day." |
| **Customer** | "No compliance page = enterprise customers won't even evaluate you." |

Every finding is categorized as **MUST FIX**, **SHOULD FIX**, or **GOOD** — with effort estimates. Starts with an Executive Summary so you know what to focus on in 30 seconds.

```
> Review this project
> Run a security + CTO review
> Review from the perspective of an enterprise HR manager
```

### `challenge` — Is this worth building at all?

When you've been fixing the same bug for an hour, Archon asks the hard question: is this feature even worth keeping?

Checks ROI, sunk cost, complexity budget, scope creep. Returns a verdict:

- **CONTINUE** — keep going, this is valuable
- **SIMPLIFY** — right goal, over-engineered approach
- **PAUSE** — validate the need before writing more code
- **DELETE** — negative ROI, remove it

Git diff and recent changes are collected automatically — zero effort from you.

### `guide` — What should I be thinking about right now?

Detects your project stage (research → architecture → building → testing → launch) and surfaces the questions you should be asking but aren't.

### Smart auto-triggers

After setup, Archon speaks up automatically when it matters:

- Editing the same file for the 3rd time → "Are you chasing a bug in a low-value feature?"
- Creating a new file → "Is this new module necessary?"
- Bug fix exceeding 30 minutes → "Should this feature be simplified or removed?"
- Adding a new dependency → "Is there a simpler alternative?"
- Completing a milestone → Full 5-perspective review

You don't need to remember to call it. It interrupts you when it should.

---

## How it works

Archon is an [MCP](https://modelcontextprotocol.io) server. It collects your project context (file structure, dependencies, README, CLAUDE.md, git history) and assembles expert-perspective prompts. Your AI tool executes the review.

**Archon never calls an LLM itself.** Zero API cost. No API key needed. Works with whatever model you already use.

One server, works everywhere:

| Editor | Config file |
|--------|------------|
| Claude Code | `.mcp.json` |
| Cursor | `.cursor/mcp.json` |
| VS Code | `.vscode/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

---

## Installation

### Option 1: Automatic (recommended)

```bash
npx archon-dev setup
```

Detects your editor and configures everything automatically.

### Option 2: Manual (Claude Code)

```bash
npm install -g archon-dev
claude mcp add archon -- archon
```

### Option 3: Manual (Cursor / VS Code)

Add to your editor's MCP config file:

```json
{
  "mcpServers": {
    "archon": {
      "command": "npx",
      "args": ["archon-dev"]
    }
  }
}
```

---

## Tools reference

| Tool | Description |
|------|-------------|
| `review` | 5-perspective architecture review |
| `challenge` | Question whether current work is worth doing |
| `guide` | Stage detection + checklist of questions to ask |
| `todo_add` | Add a finding to the project todo list |
| `todo_update` | Update todo status |
| `todo_list` | View todos, filtered by priority or status |
| `todo_summary` | Project health overview |
| `init` | Initialize Archon + auto-trigger rules |
| `save_review_findings` | Persist review summary for progress tracking |
| `archon_help` | Show usage guide |

---

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the full plan.

**V0.1** (current): 10 MCP tools, 40 tests, cross-editor support
**V0.2** (next): `spot-check`, `test-translate`, `cleanup`, `validate` + npm publish
**V1.0**: Web UI dashboard, cloud sync, custom perspectives, paid tier

---

## Contributing

Contributions welcome. Please open an issue before submitting a PR for significant changes.

```bash
npm install
npm run build
npm test
```

See [docs/architecture.md](docs/architecture.md) for technical details.

---

## License

[AGPL-3.0-or-later](LICENSE). For commercial licensing (embedded in a product, SaaS, or closed-source tool), contact the author.
