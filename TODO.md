# Callout — Roadmap

> 更新: 2026-03-07
> 状态: V0.3.4 已发布

---

## Phase 1: V0.2 — 核心工具 + 可发布状态 ✅

- [x] 14 MCP tools (review, challenge, guide, spot-check, test-translate, cleanup, validate, todo_*, init, help, save_review_findings)
- [x] 63 tests passing
- [x] npm publish (callout-dev)
- [x] GitHub Actions CI/CD
- [x] Auto-trigger rules (CLAUDE.md/.cursorrules/.windsurfrules/copilot)
- [x] Auto-Plan: 新需求先讨论再写代码
- [x] Setup 支持规则版本升级

---

## Phase 2: 社区 + 用户获取

- [x] GitHub README + GIF demo + badges
- [x] GitHub Discussions / CONTRIBUTING.md / Issue templates
- [ ] 公开案例: 用 Callout 审查真实项目
- [ ] 邀请 3-5 个独立开发者试用
- [ ] Product Hunt 发布

---

## Phase 2.5: V0.3 — 工具推荐 + 聚焦审查 + 用户视角 ✅

- [x] **recommend**: 14 种场景检测，推荐最佳工具 + 安装命令
- [x] **recommend_dismiss / recommend_reset**: 场景管理，同场景不重复推荐
- [x] **review focus**: 聚焦审查特定功能/页面/决策，保留全项目上下文
- [x] **set_target_user**: 自动检测 + 手动设置目标用户，customer 视角全覆盖
- [x] **5 点自动触发**: plan / stuck / complete / pre-ship / direction check
- [x] **用户引导**: init 展示快速开始表格 + 首次对话自动 help
- [x] **安全修复**: 路径穿越、bin 入口、文件大小限制、git cwd 校验
- [x] **代码质量**: prepublishOnly、try/catch 权限、JSON.parse 防护、版本比较修复
- [x] 18 MCP tools, 88 tests

---

## Phase 3: V1.0 — 产品化

- [ ] server.ts 拆分 (工具注册模块化)
- [ ] MCP server 集成测试
- [ ] Streamable HTTP 传输 (支持远程审查)
- [ ] CLAUDE.md 自动维护 (跨窗口记忆)
- [ ] 跨项目经验积累
- [ ] Web UI (仪表盘 + 审查历史可视化)
- [ ] 自定义审查视角 (用户自定义 perspective prompt)
- [ ] 付费层 + Landing page

---

## Phase 4: V2.0 — 数据飞轮

- [ ] 行业基准对比
- [ ] 趋势追踪
- [ ] 自动修复 PR
- [ ] 自定义视角市场 (社区贡献)
- [ ] Team 功能
- [ ] Enterprise

---

## Phase 5: V3.0 — 全程领航员

- [ ] 规划生成引擎 (需求 → Roadmap + 架构 + Todo)
- [ ] 调研阶段集成 (竞品分析)
- [ ] 上线后监控 (反馈 → todo)

---

## 待确认

- [ ] Kimi Code 规则文件格式
