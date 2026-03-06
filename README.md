# Archon

**One command, five expert architecture reviews.**

Archon is an MCP Server that performs multi-perspective architecture reviews on your codebase. It assembles structured prompts from five expert viewpoints and returns actionable findings.

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

### Options

- `perspectives`: Array of perspectives to include (default: all five)
- `customer_role`: Description of target customer (for customer perspective)

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
