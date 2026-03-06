# Archon — AI Co-founder for 0→1 Builds

## What is this

MCP Server，非技术创始人的AI副驾驶。通过多视角审查、阶段引导、产品质疑帮用户发现"不知道该问的问题"。所有发现汇入 todo list 统一管理。

## Product Context (为什么做这个)

**起源**: 创始人用AI(Claude Code/Cursor)6天建了CodeLens产品(691测试/186文件)。Day 5做多视角审查发现60%过度设计，9天工作量可缩减到3.5天。核心洞察: **用户不知道该问什么问题**——不是代码写错了，是方向和优先级错了。

**目标用户**: 用AI代替工程团队的非技术创始人。不是程序员。这个人用Cursor/Claude Code/Kimi Code让AI写代码，但没有CTO/产品经理帮他把关方向。

**核心理念**:
1. 五视角不是"审查"，是帮用户发现盲区（包括专利/合规/部署这些他从没想过的问题）
2. 发现必须变成行动 → 所有工具输出汇入todo list
3. 不需要主动调用 → CLAUDE.md/.cursorrules规则自动触发
4. Archon不调LLM → 只组装prompt，让宿主执行，零API成本

**商业模式**: 开源(AGPL)做分发 → Pro Cloud($29/月) → Team($199/月) → Enterprise(联系销售)

**竞品**: 没有任何工具做"多视角审查+阶段引导+todo管理"的组合。GitHub Spec-Kit(74.4K stars)做规划流程，MetaGPT做代码生成——都不做"该不该做"的判断。

## Current Status & Next Steps

**V0.1已完成**: 10个MCP tools, 40 tests, 9 commits
**当前任务**: V0.2 — 4个新工具 + GitHub Actions CI/CD + npm publish
**完整计划**: 见 `TODO.md`
**产品路线图**: 见 `docs/roadmap.md`
**技术架构**: 见 `docs/architecture.md`

## Quick Start

```bash
npm install          # 安装依赖
npm run build        # tsc → dist/
npm run test         # vitest run (40 tests, 5 files)
npm run dev          # tsc --watch
```

## Project Structure

```
src/
├── server.ts          # MCP Server入口，注册10个tools
├── types.ts           # ProjectContext, Perspective 类型定义
├── context.ts         # 项目上下文收集器 (文件树/依赖/技术栈/统计)
├── review.ts          # 5视角审查引擎 + Executive Summary
├── challenge.ts       # 产品质疑引擎 (ROI/沉没成本/范围蔓延)
├── guide.ts           # 阶段检测器 + 检查清单 (5阶段×7问题)
├── todo.ts            # Todo核心 (add/update/list/summary)
├── history.ts         # 审查历史持久化 (.archon/history.json)
├── git.ts             # Git自动收集 (diff/log)
├── setup.ts           # CLI: npx archon-dev setup
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
├── roadmap.md         # 产品路线图 + 商业模式
├── architecture.md    # 技术架构 + CI/CD + 测试策略
├── methodology.md     # 七步方法论 (来自CodeLens 0→1经验)
├── product-plan.md    # 产品方案
└── deep-analysis.md   # 竞品分析 + 市场研究
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
| 数据持久化 | 项目本地 .archon/ 目录 | 零配置，跟项目走，可git跟踪 |
| 名字 | Archon (暂定) | 后续根据用户反馈可能调整 |
| 许可证 | AGPL-3.0 + 商业双授权 | 防SaaS竞争，企业需买商业授权 |
| CI/CD | GitHub Actions | PR自动test+build，tag自动npm publish |
| 目标用户 | 非技术创始人 (用AI代替团队) | 不是程序员工具，是创始人工具 |

## Code Conventions

- 所有文件用 ESM (import/export)，`.js` 扩展名在import路径中
- Prompt模板导出 `(context: ProjectContext, ...args) => string`
- MCP tool handler返回 `{ content: [{ type: 'text', text }] }`
- Todo/History操作是同步fs（简单可靠），上下文收集用async
- 测试文件用temp目录 `/tmp/archon-*-test`，beforeEach/afterEach清理
- 不用emoji（除非用户要求）
