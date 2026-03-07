# Callout — Complete Todo List

> 更新: 2026-03-06 晚
> 状态: V0.1完成 + 品牌确定 + GitHub公开就绪

---

## Phase 1: V0.2 — 新工具 + 可发布状态
**目标: npm 可安装，GitHub 可 star**

### 新工具开发

- [ ] **spot-check**: AI生成代码快速安全扫描
  - 输入: 刚生成的代码片段或文件路径
  - 输出: 只说危险的（安全漏洞/逻辑错误），10秒内出结果
  - 不做全面审查，只做"这段代码能不能放心用"
  - 测试: ≥5个

- [ ] **test-translate**: 测试结果翻译成人话
  - 输入: 测试运行输出 或 项目路径(自动跑测试)
  - 输出: "你需要手动测的只有这3件事" + 操作步骤
  - 区分: 自动化已覆盖 vs 需要人工验证 vs 没有测试
  - 给出15分钟手动测试脚本
  - 测试: ≥5个

- [ ] **cleanup**: 代码清理建议
  - 扫描: 重复文件/死代码/可合并的模块/未使用的依赖
  - 输出: 具体操作步骤（删什么/合并什么/怎么做）
  - 测试: ≥5个

- [ ] **validate**: 技术决策验证
  - 输入: "我该用X还是Y？" 或 "用Supabase对吗？"
  - 输出: 判断 + 理由 + 信心度 + 替代方案
  - 结合项目上下文（规模/阶段/技术栈）给出针对性建议
  - 测试: ≥5个

### CI/CD

- [x] **创建 GitHub 仓库** — fantasieleven-code/callout ✅ (改名完成)
- [ ] **GitHub Actions CI** (.github/workflows/ci.yml)
  - PR时: npm ci → build → test
  - main push: 同上
- [ ] **GitHub Actions Publish** (.github/workflows/publish.yml)
  - tag v* 触发: build → test → npm publish
  - 需要配置 NPM_TOKEN secret
- [ ] **npm 账户准备**
  - 确认 callout-dev 包名可用
  - 设置 npm access token

### 发布准备

- [ ] **package.json 完善**
  - repository / bugs / homepage 字段
  - files 字段 (只发布 dist/ + README + LICENSE)
  - keywords 补充
- [ ] **.npmignore** (排除 test/ src/ docs/ .callout/)
- [ ] **server.ts 加 shebang** #!/usr/bin/env node (已有，确认 dist 版本保留)
- [ ] **npm link 本地测试** — 在 CodeLens 项目上实际跑一遍完整流程
- [ ] **首次 npm publish** — `npm version 0.2.0 && git push --follow-tags`

---

## Phase 2: 内容引爆 + 用户获取
**目标: 100 GitHub stars, 10个活跃用户**

### 内容

- [x] **Twitter 线程**: "6天用AI建了一个完整产品，691个测试。然后发现60%是过度设计。" ✅ (docs/twitter-thread.md)
  - 配图: 代码量/测试数/审查前后对比
  - 结尾: 引出 Callout
- [x] **博客文章**: "AI写的代码1.7x更多问题——你需要第二双眼睛" ✅ (docs/blog-draft.md)
  - 用 CodeLens 作为真实案例
  - 数据: 9天→3.5天, 15个AR项, 专利方向
- [x] **GitHub README 优化** ✅
  - 加 GIF/截图展示实际使用效果 (待录制)
  - 加 badges (npm version, tests passing, license)
- [ ] **Product Hunt 准备** (等有50+ stars再发)

### 案例

- [ ] **用 Callout 审查 CodeLens** — 录屏或截图，作为第一个公开案例
- [ ] **用 Callout 审查 Callout 自己** — 吃自己的狗粮
- [ ] **邀请3-5个独立开发者试用** — 收集反馈

### 社区

- [x] **GitHub Discussions 开启** — 用户反馈渠道 ✅
- [x] **CONTRIBUTING.md** — 贡献指南 ✅
- [x] **Issue templates** — bug report / feature request ✅

---

## Phase 3: V1.0 — 产品化
**目标: 首个付费用户**

### 核心功能

- [ ] **Streamable HTTP 传输** — 支持远程审查
- [ ] **CLAUDE.md 自动维护** — review/guide/challenge 后自动更新决策记录
  - 这是跨窗口记忆的关键
  - 同步到 .cursorrules / .windsurfrules
- [ ] **跨项目经验** (~/.callout/experience.json)
  - "你上个项目也用了4级角色，最后砍成2级"
  - 跨项目的踩坑知识积累

### Web UI

- [ ] **项目仪表盘** — todo看板 + 健康度评分 + 趋势图
- [ ] **审查历史可视化** — 每次review的MUST FIX数量趋势
- [ ] **技术栈**: React / Next.js / Supabase(auth+db)

### 付费

- [ ] **用户账户** — GitHub OAuth
- [ ] **Stripe 集成** — Pro Cloud $29/月
- [ ] **使用量追踪** — 免费版限制review次数/月
- [ ] **Landing page** — 场景化文案 + 定价页

---

## Phase 4: V2.0 — 数据飞轮
**目标: 1K活跃用户, 数据壁垒**

- [ ] **行业基准** — "同规模SaaS安全评分中位数72，你45"
- [ ] **趋势追踪** — "你的技术债3个月增长40%"
- [ ] **自动修复PR** — 从"告诉你哪里错"到"帮你改"
- [ ] **自定义视角市场** — 社区贡献的审查视角
- [ ] **Team 功能** — 团队共享todo + SSO + 审计日志

---

## Phase 5: V3.0 — 全程副驾驶
**目标: 覆盖调研→上线完整流程**

- [ ] **调研阶段** — 接入搜索API做竞品分析 + 方向质疑
- [ ] **架构阶段** — 自动生成CLAUDE.md + todo + roadmap骨架
- [ ] **上线后监控** — 对接用户反馈 → 自动归类到todo
- [ ] **月度健康报告** — 自动review + 趋势对比
- [ ] **Enterprise** — 私有部署 + 商业授权 + SLA

---

## 待确认/待调研

- [ ] Kimi Code 的规则文件格式 — 确认后加入 setup
- [x] 产品名称最终确定 — **Callout** ✅
- [x] npm 包名确认 — **callout-dev** 可用 ✅
- [x] 域名注册 — **callout.dev** 已注册 (Cloudflare) ✅
- [ ] Callout 自己要不要有 CLAUDE.md 自动触发规则（吃自己的狗粮）

---

## 已完成 ✅

### V0.1 (2026-03-06)
- [x] MCP Server 骨架 (McpServer + StdioServerTransport)
- [x] 项目上下文收集器 (context.ts)
- [x] 5个审查视角 prompt (cto/security/product/devops/customer)
- [x] review 工具 — 5视角审查 + Executive Summary
- [x] challenge 工具 — 产品质疑 (CONTINUE/SIMPLIFY/PAUSE/DELETE)
- [x] guide 工具 — 阶段检测 + 检查清单 (5阶段×7问题)
- [x] todo 工具组 — add/update/list/summary
- [x] init 工具 — 初始化 + 自动CTO快速审查
- [x] callout_help 工具 — 使用引导
- [x] save_review_findings 工具 — 审查历史持久化
- [x] npx callout-dev setup — 一键配置CLI
- [x] 跨工具规则文件支持 (CLAUDE.md/.cursorrules/.windsurfrules/copilot)
- [x] challenge 自动收集 git diff
- [x] 审查历史追踪 (.callout/history.json)
- [x] CLAUDE.md 自动触发规则模板
- [x] README 场景化重写
- [x] CLAUDE.md (项目技术文档)
- [x] docs/roadmap.md (产品路线图)
- [x] docs/architecture.md (技术架构)
- [x] docs/methodology.md (七步方法论)
- [x] docs/product-plan.md (产品方案)
- [x] docs/deep-analysis.md (竞品分析)
- [x] .gitignore
- [x] LICENSE (AGPL-3.0)
- [x] 40个测试全部通过 (5个测试文件)
- [x] 从 CodeLens 迁移文档 (07/08/09-*.md)
- [x] CodeLens Tasks #40-#45 commit + push
