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

**V0.5.1**: 16 MCP tools, 142 tests, npm published
**路线图**: 见 `TODO.md` 和 `docs/roadmap.md`
**技术架构**: 见 `docs/architecture.md`

## Quick Start

```bash
npm install          # 安装依赖
npm run build        # tsc → dist/
npm run test         # vitest run (134 tests, 14 files)
npm run dev          # tsc --watch
```

## Project Structure

```
src/
├── server.ts          # MCP Server入口 (~55行，bootstrap + instructions + 4 register calls)
├── util.ts            # 共享工具函数 (resolvePath, withPathHeader)
├── handlers/          # 工具注册模块 (4个文件)
│   ├── analysis.ts    # 4工具: review, test_translate, coach, idea_score
│   ├── todo.ts        # 4工具: todo_add, todo_update, todo_list, todo_summary
│   ├── recommend.ts   # 3工具: recommend, recommend_dismiss, recommend_reset
│   └── meta.ts        # 5工具: init, callout_help, save_review_findings, set_target_user, portfolio
├── types.ts           # ProjectContext, Perspective, PerspectiveGroup 类型定义
├── context.ts         # 项目上下文收集器 (文件树/依赖/技术栈/统计)
├── review.ts          # 9视角审查引擎 + Executive Summary (3组: technical/business/founder)
├── coach.ts           # AI协作教练 (环境诊断/行为模式/知识盲区)
├── challenge.ts       # 产品质疑 prompt builder (被 review focus 复用)
├── guide.ts           # 阶段检测器 + 检查清单 (被 coach 复用)
├── todo.ts            # Todo核心 (add/update/list/summary)
├── history.ts         # 审查历史持久化 (.callout/history.json)
├── config.ts          # 项目配置 + 目标用户自动检测
├── git.ts             # Git自动收集 (diff/log)
├── portfolio.ts       # 多项目扫描 + 汇总 prompt builder
├── recommend.ts       # Dismissed场景追踪 (.callout/dismissed.json)
├── setup.ts           # CLI: npx callout-dev setup
├── rules-template.ts  # CLAUDE.md自动触发规则模板
└── prompts/           # 9个视角prompt模板 + 工具类prompt
    ├── cto.ts         # 过度设计/技术债/扩展瓶颈/砍什么
    ├── security.ts    # OWASP/认证/输入验证/数据隔离
    ├── product.ts     # 用户旅程/缺失功能/定位清晰度
    ├── devops.ts      # 部署/监控/备份/CI
    ├── customer.ts    # 拒绝理由/体验缺口 (支持自定义角色)
    ├── strategy.ts    # 资源分配/商业模式/竞争壁垒/GTM
    ├── investor.ts    # 市场规模/团队匹配/收入模型/护城河/资本效率
    ├── unicorn-founder.ts # 速度优先/核心功能/规模思维/砍半测试
    ├── solo-entrepreneur.ts # 单人可行性/时间预算/运维负担/倦怠风险
    ├── idea-score.ts  # 10维度量化评分 (challenge的怀疑论变体)
    └── recommend.ts   # 场景检测 + 工具推荐prompt builder
test/
├── server.test.ts     # 21 tests (集成测试: 16工具注册 + instructions验证)
├── coach.test.ts      # 14 tests
├── portfolio.test.ts  # 12 tests
├── review.test.ts     # 11 tests
├── idea-score.test.ts # 6 tests
├── challenge.test.ts  # 7 tests (prompt builder测试，工具已合并入review)
├── guide.test.ts      # 10 tests (prompt builder测试，阶段检测被coach复用)
├── todo.test.ts       # 9 tests
├── history.test.ts    # 6 tests
├── config.test.ts     # 10 tests
├── recommend.test.ts  # 13 tests
├── spot-check.test.ts # 6 tests (prompt builder测试)
├── cleanup.test.ts    # 6 tests (prompt builder测试)
├── validate.test.ts   # 6 tests (prompt builder测试)
└── test-translate.test.ts # 5 tests
docs/
├── roadmap.md         # 产品路线图
└── architecture.md    # 技术架构 + CI/CD + 测试策略
```

## Tech Stack

- **Runtime**: Node.js ≥18, TypeScript (strict, ESNext, NodeNext)
- **MCP**: @modelcontextprotocol/sdk (stdio transport)
- **Validation**: Zod
- **Test**: Vitest
- **License**: MIT

## Key Design Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| MCP传输 | stdio (V0.1) → +Streamable HTTP (V1) | stdio最简单先发布，HTTP支持远程审查 |
| LLM调用 | 不直接调LLM | MCP Server只组装prompt，让宿主(Claude/Cursor)执行 |
| 数据持久化 | 项目本地 .callout/ 目录 | 零配置，跟项目走，可git跟踪 |
| 名字 | Callout | callout.dev |
| 许可证 | MIT | 最大化传播，商业化靠 SaaS 云端服务 |
| CI/CD | GitHub Actions | PR自动test+build，tag自动npm publish |
| 目标用户 | 非技术创始人 (用AI代替团队) | 不是程序员工具，是创始人工具 |

## Code Conventions

- 所有文件用 ESM (import/export)，`.js` 扩展名在import路径中
- Prompt模板导出 `(context: ProjectContext, ...args) => string`
- Handler 文件导出 `register*Tools(server: McpServer): void`，server.ts 调用注册
- MCP tool handler返回 `{ content: [{ type: 'text', text }] }`
- Todo/History操作是同步fs（简单可靠），上下文收集用async
- 测试文件用temp目录 `/tmp/callout-*-test`，beforeEach/afterEach清理
- 不用emoji（除非用户要求）


## Git Push Safety Rules

- `.gitignore` 中列出的目录和文件**永远不能推送**
- 推送前**必须**运行 `git status` 确认没有意外跟踪的文件
- **永远不要** `git add -A` 或 `git add .` — 逐个添加文件
- 公开文件（CLAUDE.md、TODO.md、docs/）不能包含商业敏感信息

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
