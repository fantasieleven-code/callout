# Callout Product Roadmap

> 最后更新: 2026-03-07

## Vision

**让每一个用AI创业的人，从Day 1就有一个懂产品、懂技术、懂商业的AI副驾驶。**

核心洞察：非技术创始人用AI写代码越来越快，但最大的问题不是"怎么做"，而是"不知道该问什么"。Callout 在每个阶段主动推送该问的问题，暴露盲区，追踪执行。

---

## V0.2 — 已发布 ✅

**14 MCP tools, 63 tests, npm published**

| 类别 | 工具 |
|------|------|
| 审查 | review (5视角), spot-check, cleanup |
| 决策 | challenge, validate, guide |
| 翻译 | test-translate |
| 管理 | todo_add/update/list/summary, save_review_findings |
| 配置 | init, callout_help |

基础设施: npx setup, Auto-trigger rules, Auto-Plan, git diff 自动收集, 审查历史追踪

---

## V0.3 — 已发布 ✅

**18 MCP tools, 88 tests**

| 新功能 | 说明 |
|--------|------|
| recommend | 14 种场景检测，推荐最佳工具 + 安装命令 + 上手步骤 |
| recommend_dismiss / reset | 场景管理，同场景不重复推荐 |
| review focus | 聚焦审查特定功能/页面，保留全项目上下文 |
| set_target_user | 自动检测目标用户，customer 视角以真实用户身份审查 |
| 5 点自动触发 | plan → stuck → complete → pre-ship → direction check |
| 用户引导 | init 快速开始表格 + 首次对话自动 help |

安全 + 质量: 路径穿越修复、bin 入口修复、文件大小限制、prepublishOnly

---

## V1.0 — 产品化 (下一步)

- Streamable HTTP 传输 (远程审查)
- server.ts 模块化拆分
- MCP server 集成测试
- CLAUDE.md 自动维护 (跨窗口记忆)
- 跨项目经验积累
- Web UI 仪表盘
- 自定义审查视角
- 付费层

---

## V2.0 — 数据飞轮

- 行业基准对比
- 趋势追踪
- 自动修复 PR
- 视角市场 (社区贡献)
- Team 功能
- Enterprise

---

## V3.0 — 全程领航员

- 规划生成引擎 (需求 → Roadmap + 架构 + Todo)
- 调研阶段集成 (竞品分析)
- 上线后监控 (反馈 → todo)

---

## 开源策略

- 许可证: AGPL-3.0 + 商业双授权
- 核心工具免费开源
- 云端/团队/企业功能付费
