# Callout

[![npm version](https://img.shields.io/npm/v/callout-dev)](https://www.npmjs.com/package/callout-dev)
[![npm downloads](https://img.shields.io/npm/dm/callout-dev)](https://www.npmjs.com/package/callout-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**You used AI to write code for 3 days. Callout tells you 60% of it was over-engineered.**

AI coding tools make you 10x faster at writing code. Nobody checks if you're building the *right* thing. Callout is the second pair of eyes — 9 expert perspectives that catch what you miss, delivered as an MCP server that works inside Claude Code, Cursor, VS Code, and Windsurf.

---

## Why Callout exists

A real product was built using Claude Code in 6 days: 186 files, 691 tests. A multi-perspective review on Day 5 found that 60% was over-engineered. 9 days of planned work reduced to 3.5 days. The key insight: **the problem wasn't bad code — it was wrong priorities and missed blind spots**.

Callout makes that review available to every developer, automatically.

---

## 30-second setup

```bash
npx callout-dev setup
```

No global install needed. Run this from your project directory. Callout auto-detects your editor and configures the MCP server.

**After setup, restart your editor** (or re-enter Claude Code from the project directory), then say:

```
Review this project
```

<details>
<summary>Manual setup (if npx setup doesn't work)</summary>

**Claude Code:**
```bash
claude mcp add callout -- npx callout-dev
```

**Cursor / VS Code** — add to your editor's MCP config (`.cursor/mcp.json` or `.vscode/mcp.json`):
```json
{
  "mcpServers": {
    "callout": {
      "command": "npx",
      "args": ["callout-dev"]
    }
  }
}
```

**Windsurf** — add to `~/.codeium/windsurf/mcp_config.json` with the same format.

After any manual setup, **restart your editor** so it picks up the new MCP server.
</details>

---

## Quick Start: What to say

| Phase | What you want | Say this to AI | What happens |
|-------|--------------|----------------|--------------|
| **Get started** | Check my AI collaboration habits | "Coach me" | Scans your project setup, finds blind spots, outputs improvement checklist |
| | Evaluate this project | "Review this project" | 9 expert perspectives review your project, categorize as MUST FIX / SHOULD FIX / GOOD |
| | Is this idea worth building? | "Score this idea" | 10-dimension scoring, verdict: CONTINUE / SIMPLIFY / PAUSE / DELETE |
| **Go deeper** | Get advice on a specific decision | "Review focus: should I use Supabase?" | Multi-perspective review focused on one question |
| | Make AI read docs before coding | "Bind Stripe docs to payment code" | AI must read official docs before modifying protected files — no more guessing |
| | What tool should I use? | "I need to add payments" | Detects project needs, recommends best tool with install steps |
| **Manage** | See all findings and progress | "Show my todos" | All review/coach findings auto-collected, sorted by priority |

> **Multi-project?** Say **"portfolio"** for cross-project health status and resource allocation advice.

---

## Hosted deployment

A hosted deployment is available on [Fronteir AI](https://fronteir.ai/mcp/fantasieleven-code-callout).

## Core Features

### `review` — 9 expert perspectives on your project

3 groups, 9 perspectives:

| Group | Perspectives | What they catch |
|-------|-------------|----------------|
| **Technical** | CTO, Security, DevOps | Over-engineering, vulnerabilities, deployment gaps |
| **Business** | Product, Customer, Strategy | Missing features, UX gaps, business model issues |
| **Founder** | Investor, Unicorn Founder, Solo Entrepreneur | Market fit, scalability, solo feasibility |

Every finding is categorized as **MUST FIX**, **SHOULD FIX**, or **GOOD** with effort estimates. Starts with an Executive Summary.

```
> Review this project                              — full 9-perspective review
> Review with founder group                        — investor + unicorn founder + solo entrepreneur
> Review focus: should I use Supabase or Firebase?  — focused on one decision
> Review security + CTO only                       — selected perspectives
```

### `coach` — AI collaboration blind spot detector

Analyzes your project setup, development habits, and knowledge gaps. Tells you what you don't know you're doing wrong when working with AI coding tools.

### `idea_score` — Quantitative idea validator

Scores your idea across 10 dimensions (market size, feasibility, moat, revenue potential, etc.) with a skeptical default stance. Returns a verdict: CONTINUE, SIMPLIFY, PAUSE, or DELETE.

### Domain Knowledge Guard — Make AI read docs before coding

Bind official documentation to code paths. Once bound, AI **must** read the referenced docs before modifying protected files.

```
> Bind Stripe docs to payment code     — register a doc binding
> Check if my code matches the docs    — compliance verification
> Start a renovation for stripe        — systematic domain knowledge audit
```

Tools: `doc` (register/remove/list/check), `doc_gate`, `renovation`

### `test_translate` — Plain-language test results

Parses test output and tells you: what's tested, what failed, and produces a manual test script.

### `recommend` — Tool recommendations

Detects what your project needs (auth, database, payments, etc.) and recommends the best tool — with install commands, setup steps, and alternatives.

### Smart auto-triggers

After running `init`, Callout speaks up automatically:

- New feature described → discusses before coding
- Opening a new project → coach analysis
- Modifying doc-protected files → gates until docs are read
- Completing a milestone → suggests review

---

## Works Best With (optional companion MCPs)

Callout integrates with these MCP servers when installed — no configuration needed:

| MCP | What it adds | Install |
|-----|-------------|---------|
| **Context7** | Auto-pulls latest docs for 9000+ public libraries — feed into `doc register` | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| **Sequential Thinking** | Structured step-by-step reasoning for complex renovations and multi-perspective reviews | `claude mcp add sequential-thinking -- npx -y @anthropic-ai/mcp-server-sequential-thinking` |
| **Firecrawl** | Scrapes any web docs into markdown — bind with `doc register` | `claude mcp add firecrawl -- npx -y firecrawl-mcp` |

---

## How it works

Callout is an [MCP](https://modelcontextprotocol.io) server. It collects your project context (file structure, dependencies, README, git history) and assembles expert-perspective prompts. Your AI tool executes the review.

**Callout never calls an LLM itself.** Zero API cost. No API key needed. Works with whatever model you already use.

---

## All 19 tools

| Tool | Description |
|------|-------------|
| `review` | 9-perspective architecture review (3 groups: technical, business, founder) |
| `coach` | AI collaboration blind spot detector |
| `idea_score` | 10-dimension idea scoring with verdict |
| `test_translate` | Turn test output into plain-language test plan |
| `doc` | Domain Knowledge Guard — register/remove/list/check doc bindings |
| `doc_gate` | Gate check: returns docs AI must read before modifying a file |
| `renovation` | Systematic domain knowledge audit against official docs |
| `recommend` | Detect project needs and recommend best tools |
| `recommend_dismiss` | Dismiss a recommendation scenario |
| `recommend_reset` | Reset all dismissed recommendations |
| `todo_add` | Add a finding to the project todo list |
| `todo_update` | Update todo status |
| `todo_list` | View todos by priority or status |
| `todo_summary` | Project health overview |
| `init` | Initialize auto-trigger rules |
| `callout_help` | Show usage guide |
| `save_review_findings` | Save review summary for progress tracking |
| `set_target_user` | Set target user for customer perspective |
| `portfolio` | Multi-project overview with resource allocation advice |

---

## Contributing

Contributions welcome. Please open an issue before submitting a PR for significant changes.

```bash
npm install
npm run build
npm test
```

---

## License

[MIT](LICENSE)
