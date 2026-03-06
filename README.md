# Archon

**Architecture review + product-level challenge for AI-assisted development.**

Archon is an MCP Server with two tools: `review` (5-perspective architecture audit) and `challenge` (questions whether your current work is worth doing). It can auto-trigger during development via CLAUDE.md rules.

## Perspectives

| Perspective | Focus |
|-------------|-------|
| CTO | Over-engineering, tech debt, scaling bottlenecks, what to cut |
| Security | OWASP Top 10, auth, input validation, data isolation |
| Product | User journey gaps, missing features, competitive gaps |
| DevOps | Deployment complexity, monitoring, backup, CI/CD |
| Customer | Reasons to reject, experience gaps, onboarding friction |

## Install

```bash
npm install -g archon-dev
```

## Usage with Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "archon": {
      "command": "archon",
      "args": []
    }
  }
}
```

Then in Claude Code:

```
Use the review tool to analyze this project
```

```
Use the challenge tool — I've been fixing this RTC bug for an hour
```

```
Use the init tool to set up auto-trigger rules
```

## Tools

### `review` — Multi-perspective architecture audit

Runs 5 expert viewpoints against your codebase. Options:

- `perspectives`: Array of perspectives to include (default: all five)
- `customer_role`: Description of target customer (for customer perspective)

### `challenge` — Product-level reality check

Questions whether your current work is worth doing. Checks ROI, sunk cost, complexity budget, and scope creep. Returns a verdict: CONTINUE / SIMPLIFY / PAUSE / DELETE. Options:

- `git_diff`: Output of `git diff` (auto-collected by host)
- `recent_files`: Output of `git log --oneline -10 --name-only`
- `description`: What you're currently working on

### `init` — Set up auto-trigger rules

Returns CLAUDE.md rules that make Claude Code automatically call `challenge` and `review` at the right moments:

- Before creating new files
- When modifying the same file 3+ times
- Before adding dependencies
- When a bug fix exceeds 30 minutes
- After completing milestones

## Usage with Other Tools

Works with any MCP-compatible tool:

- **Cursor**: `.cursor/mcp.json`
- **VS Code**: `.vscode/mcp.json`
- **Windsurf**: `~/.codeium/windsurf/mcp_config.json`

All use the same `mcpServers` JSON structure above.

## Output Format

Findings are categorized:

- **MUST FIX**: Critical issues that block production readiness
- **SHOULD FIX**: Important improvements with clear ROI
- **GOOD**: Confirmed correct decisions worth keeping

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) for details.

For commercial licensing, contact the author.
