# Callout — AI Co-founder for 0→1 Builds

## What is this

MCP Server，非技术创始人的AI副驾驶。通过多视角审查、阶段引导、产品质疑帮用户发现"不知道该问的问题"。所有发现汇入 todo list 统一管理。

## Product Context

**目标用户**: 用AI代替工程团队的非技术创始人。用Cursor/Claude Code/Kimi Code让AI写代码，但没有CTO/产品经理帮他把关方向。

**核心理念**:
1. 五视角帮用户发现盲区（包括专利/合规/部署这些从没想过的问题）
2. 发现必须变成行动 → 所有工具输出汇入todo list
3. 不需要主动调用 → CLAUDE.md/.cursorrules规则自动触发
4. Callout不调LLM → 只组装prompt，让宿主执行，零API成本

## Current Status

**V0.2.5**: 14 MCP tools, 63 tests, npm published
**路线图**: 见 `TODO.md` 和 `docs/roadmap.md`
**技术架构**: 见 `docs/architecture.md`

## Quick Start

```bash
npm install          # 安装依赖
npm run build        # tsc → dist/
npm run test         # vitest run (63 tests, 9 files)
npm run dev          # tsc --watch
```

## Project Structure

```
src/
├── server.ts          # MCP Server入口，注册14个tools
├── types.ts           # ProjectContext, Perspective 类型定义
├── context.ts         # 项目上下文收集器 (文件树/依赖/技术栈/统计)
├── review.ts          # 5视角审查引擎 + Executive Summary
├── challenge.ts       # 产品质疑引擎 (ROI/沉没成本/范围蔓延)
├── guide.ts           # 阶段检测器 + 检查清单 (5阶段×7问题)
├── todo.ts            # Todo核心 (add/update/list/summary)
├── history.ts         # 审查历史持久化 (.callout/history.json)
├── git.ts             # Git自动收集 (diff/log)
├── setup.ts           # CLI: npx callout-dev setup
├── rules-template.ts  # CLAUDE.md自动触发规则模板
└── prompts/           # 5个视角prompt模板
    ├── cto.ts         # 过度设计/技术债/扩展瓶颈/砍什么
    ├── security.ts    # OWASP/认证/输入验证/数据隔离
    ├── product.ts     # 用户旅程/缺失功能/定位清晰度
    ├── devops.ts      # 部署/监控/备份/CI
    └── customer.ts    # 拒绝理由/体验缺口 (支持自定义角色)
test/
├── review.test.ts     # 8 tests
├── challenge.test.ts  # 7 tests
├── guide.test.ts      # 10 tests
├── todo.test.ts       # 9 tests
└── history.test.ts    # 6 tests
docs/
├── roadmap.md         # 产品路线图
└── architecture.md    # 技术架构 + CI/CD + 测试策略
```

## Tech Stack

- **Runtime**: Node.js ≥18, TypeScript (strict, ESNext, NodeNext)
- **MCP**: @modelcontextprotocol/sdk (stdio transport)
- **Validation**: Zod
- **Test**: Vitest
- **License**: AGPL-3.0-or-later

## Key Design Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| MCP传输 | stdio (V0.1) → +Streamable HTTP (V1) | stdio最简单先发布，HTTP支持远程审查 |
| LLM调用 | 不直接调LLM | MCP Server只组装prompt，让宿主(Claude/Cursor)执行 |
| 数据持久化 | 项目本地 .callout/ 目录 | 零配置，跟项目走，可git跟踪 |
| 名字 | Callout | callout.dev |
| 许可证 | AGPL-3.0 + 商业双授权 | 防SaaS竞争，企业需买商业授权 |
| CI/CD | GitHub Actions | PR自动test+build，tag自动npm publish |
| 目标用户 | 非技术创始人 (用AI代替团队) | 不是程序员工具，是创始人工具 |

## Code Conventions

- 所有文件用 ESM (import/export)，`.js` 扩展名在import路径中
- Prompt模板导出 `(context: ProjectContext, ...args) => string`
- MCP tool handler返回 `{ content: [{ type: 'text', text }] }`
- Todo/History操作是同步fs（简单可靠），上下文收集用async
- 测试文件用temp目录 `/tmp/callout-*-test`，beforeEach/afterEach清理
- 不用emoji（除非用户要求）


## Callout Auto-Trigger Rules

When Callout MCP server is available, follow these rules automatically:

### project_path — ALWAYS required
Every Callout tool call MUST include `project_path` set to the absolute path of the project currently being worked on.
Derive it from the files you are reading or editing — do NOT rely on the default (process.cwd() of the MCP server is fixed at launch and will point to the wrong directory if the user did not start the CLI from the project root).

Example: if you are editing `/Users/alice/projects/my-app/src/auth.ts`, pass `project_path: "/Users/alice/projects/my-app"`.

### Auto-Challenge (use the `challenge` tool)
- **Before creating a new file**: Challenge whether this new module/component is necessary
- **When modifying the same file for the 3rd+ time in a session**: Challenge whether you are chasing a bug in a low-value feature
- **Before adding a new dependency**: Challenge whether a simpler alternative exists
- **When a bug fix exceeds 30 minutes**: Challenge whether the buggy feature should be simplified or removed

### Auto-Plan (discuss before coding)
- **When the user describes a new feature or requirement**: Do NOT start writing code immediately. First call `challenge` (is this worth building?) and `validate` (what's the best approach?). Discuss architecture, scope, and trade-offs with the user. Only start implementation after the user explicitly says "go ahead", "start coding", "implement it", or similar confirmation.
- **When opening a new/empty project for the first time**: Call `guide` to discuss project planning — stage, priorities, and what to build first. Do not generate boilerplate or scaffold code until the user confirms the plan.
- **When the user asks to add a major dependency or service** (database, auth, payments, etc.): Call `validate` to discuss alternatives before installing or integrating anything.

### Auto-Review (use the `review` tool)
- **After completing a major feature or milestone**: Run a full 5-perspective review
- **Before creating a pull request**: Run CTO + Security perspectives at minimum
- **When starting work on a new project**: Run a full review to understand the codebase

### Rules
- **Plan before code**: When Auto-Plan triggers, stay in discussion mode. Present findings, ask questions, and wait for the user to decide. Do not write files, install packages, or generate code until the user explicitly approves the approach.
- **Discussion ≠ inaction**: During Auto-Plan, actively use Callout tools to provide structured analysis. The goal is informed decision-making, not delays.
- When challenge returns DELETE or PAUSE: Stop current work, present the finding to the user, and wait for their decision before continuing
- When challenge returns SIMPLIFY: Present the simpler approach and ask the user which path to take
- When challenge returns CONTINUE: Proceed without interruption
- Do NOT suppress or summarize Callout's findings — show them in full
