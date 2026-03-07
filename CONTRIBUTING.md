# Contributing to Callout

Thanks for your interest in contributing! Callout is an open-source MCP server that helps developers catch over-engineering and blind spots in AI-generated code.

## Getting started

```bash
git clone https://github.com/fantasieleven-code/callout.git
cd callout
npm install
npm run build
npm test
```

## Development workflow

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run build && npm test` — all 63 tests must pass
4. Submit a PR

## Project structure

```
src/
├── server.ts          # MCP Server entry, registers all tools
├── context.ts         # Project context collector
├── review.ts          # 5-perspective review engine
├── challenge.ts       # ROI/scope questioning engine
├── guide.ts           # Stage detection + checklists
├── todo.ts            # Todo management
├── history.ts         # Review history persistence
├── prompts/           # Perspective prompt templates
└── setup.ts           # CLI: npx callout-dev setup
test/                  # Vitest tests (mirrors src/)
```

See [docs/architecture.md](docs/architecture.md) for detailed technical design.

## What to contribute

- **Bug fixes** — always welcome, no issue required
- **New perspectives** — add expert viewpoints to `src/prompts/`
- **Editor support** — help Callout work in more editors
- **Documentation** — improve guides, add examples

For significant changes (new tools, architecture changes), please open an issue first to discuss the approach.

## Code conventions

- ESM imports with `.js` extensions in import paths
- Prompt templates export `(context: ProjectContext, ...args) => string`
- MCP tool handlers return `{ content: [{ type: 'text', text }] }`
- Tests use temp directories (`/tmp/callout-*-test`), cleaned up in beforeEach/afterEach
- No emojis in code or output

## Running tests

```bash
npm test              # Run all tests
npm run build         # TypeScript compilation
```

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0-or-later](LICENSE) license.
