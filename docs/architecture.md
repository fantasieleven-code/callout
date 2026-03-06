# Archon Technical Architecture

> 最后更新: 2026-03-06

---

## System Overview

```
用户的IDE (Claude Code / Cursor / VS Code / Windsurf)
    │
    │ MCP Protocol (stdio / HTTP)
    │
    ▼
┌─────────────────────────────────────┐
│           Archon MCP Server          │
│                                     │
│  ┌──────────┐  ┌───────────────┐   │
│  │ Context   │  │ Stage         │   │
│  │ Collector │  │ Detector      │   │
│  │ (context) │  │ (guide)       │   │
│  └────┬──────┘  └──────┬────────┘   │
│       │                │            │
│  ┌────▼────────────────▼────────┐   │
│  │        Tool Router           │   │
│  │  guide | review | challenge  │   │
│  │  spot-check | test-translate │   │
│  │  cleanup | validate          │   │
│  │  todo_* | init | help        │   │
│  └────┬─────────────────────────┘   │
│       │                             │
│  ┌────▼────────────────────────┐    │
│  │    Prompt Assembler          │    │
│  │  5 perspectives + context    │    │
│  │  → structured prompt         │    │
│  └──────────────────────────────┘    │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────┐
    │  项目/.archon/    │
    │  ├── todo.json    │  ← 所有发现的执行追踪
    │  └── history.json │  ← 审查历史(跨review对比)
    └──────────────────┘
```

## Core Principle: Archon不调LLM

Archon 只做两件事：
1. **收集上下文** — 扫描项目结构、依赖、代码统计、git历史
2. **组装prompt** — 把上下文 + 视角模板 + 历史记录组装成结构化prompt

**LLM推理由宿主（Claude Code/Cursor）执行。** 这意味着：
- 零API成本
- 不需要配置API key
- 用户用什么模型就用什么模型
- Archon永远不会因为API配额限制而不可用

---

## Data Flow

### review 数据流
```
用户说"review this project"
    │
    ▼
collectContext(cwd)          ← 扫描文件树、读package.json/README/CLAUDE.md
    │
    ▼
buildHistoryContext(cwd)     ← 加载.archon/history.json，生成对比指令
    │
    ▼
buildReviewPrompt(context, perspectives)   ← 5个视角prompt + Executive Summary
    │
    ▼
返回组装好的prompt给宿主     ← 宿主(Claude)执行审查
    │
    ▼
宿主调用 save_review_findings ← 保存摘要到history.json
    │
    ▼
宿主调用 todo_add × N        ← 每个MUST/SHOULD FIX变成todo项
```

### challenge 数据流
```
自动触发(改文件3次) 或 用户主动调用
    │
    ▼
isGitRepo(cwd) → getGitDiff() + getRecentFiles()    ← 自动收集
    │
    ▼
collectContext(cwd)
    │
    ▼
buildChallengePrompt(context, diff, files)
    │
    ▼
宿主执行 → verdict: CONTINUE/SIMPLIFY/PAUSE/DELETE
    │
    ▼
PAUSE/DELETE → 宿主自动 todo_add (priority: must)
```

### guide 数据流
```
用户说"guide me" 或 init时自动触发
    │
    ▼
collectContext(cwd)
    │
    ▼
detectStage(context) → research | architecture | building | testing | launch
    │
    ▼
buildGuidePrompt(context) → 该阶段的7个检查问题
    │
    ▼
用户回答 → 不确定的问题 → todo_add
```

---

## Transport Protocol

### V0.1-V0.2: stdio (当前)
```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```
- 进程启动 → stdin/stdout通信 → 进程退出
- 适合本地使用，npm install即可

### V1.0: + Streamable HTTP
```typescript
// 同时支持stdio和HTTP
if (process.argv.includes('--http')) {
  const transport = new StreamableHTTPTransport({ port: 3100 });
  await server.connect(transport);
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```
- 支持远程审查（team成员共享一个Archon实例）
- 支持Web UI连接
- 是SaaS化的基础

---

## Persistence Layer

```
项目根目录/
└── .archon/
    ├── todo.json        # TodoList { nextId, items[] }
    └── history.json     # ReviewHistory { reviews[] }
```

### todo.json Schema
```typescript
interface TodoItem {
  id: number;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'nice';
  status: 'open' | 'in_progress' | 'done' | 'wont_do';
  source: string;       // "CTO review", "Security review", "challenge", "guide", "user"
  createdAt: string;     // ISO 8601
  updatedAt: string;
}
```

### history.json Schema
```typescript
interface ReviewRecord {
  date: string;          // YYYY-MM-DD
  perspectives: string[];
  findingSummary: string;
}
```

### .gitignore 建议
用户可以选择是否跟踪 `.archon/`：
- **跟踪**：团队共享todo和审查历史
- **不跟踪**：每个人有自己的todo

---

## MCP Integration Points

所有编辑器用同一个 `mcpServers` JSON结构：

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

| 编辑器 | 配置文件位置 |
|--------|------------|
| Claude Code | `.mcp.json` 或 `~/.claude.json` |
| Cursor | `.cursor/mcp.json` |
| VS Code | `.vscode/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

`npx archon-dev setup` 自动检测已安装的编辑器并写入配置。

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run build
      - run: npm test

# .github/workflows/publish.yml
name: Publish
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 发布流程
```bash
# 1. 更新版本
npm version patch/minor/major

# 2. 推送tag (触发自动发布)
git push --follow-tags
```

---

## Test Strategy

### 当前 (V0.1)
- **单元测试**: Vitest, 40 tests, 5 files
- **测试覆盖**: prompt构建、阶段检测、todo增删改查、历史持久化
- **测试隔离**: 用 /tmp/archon-*-test 临时目录，beforeEach/afterEach清理

### V0.2 目标
- 新工具的单元测试 (spot-check, test-translate, cleanup, validate)
- MCP协议集成测试 (模拟stdio通信，验证tool注册和调用)
- setup CLI测试 (验证配置文件生成)

### V1.0 目标
- HTTP传输集成测试
- 端到端测试 (安装 → setup → guide → review → todo → 验证输出)
- 性能测试 (大项目的上下文收集 <5秒)

### 测试原则
- 每个新工具至少5个测试
- prompt模板测试只验证结构/关键词，不验证具体措辞
- 文件系统操作用临时目录隔离
- 不mock MCP SDK（直接测试prompt构建逻辑）

---

## Security Considerations

- Archon读取项目文件但**不上传任何数据**（纯本地）
- git.ts 的 execSync 设置 10秒 timeout 防止hang
- git diff 输出截断到 8000字节 防止内存问题
- setup.ts 不覆盖已有配置（检查后才写入）
- AGPL许可证防止他人将Archon SaaS化而不开源

---

## Context Window Management

Archon的设计考虑了宿主的上下文窗口限制：

| 策略 | 实现方式 |
|------|---------|
| README/CLAUDE.md截断 | readme.slice(0, 3000), claudeMd.slice(0, 5000) |
| 文件树深度限制 | 最多8层深度, 前100个条目 |
| git diff截断 | 最多8000字节 |
| 历史记录限制 | 最多保留50条, 只加载最近5条到prompt |
| 代码行数采样 | 只统计前200个代码文件 |
| Executive Summary | 30秒速览, 用户可选择是否看详细 |
