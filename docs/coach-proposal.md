# Coach — AI 协作教练

> 提案日期: 2026-03-09
> 状态: 草案，待多视角审查

---

## 一句话定义

`coach` 分析你的项目结构和开发习惯，告诉你哪些做法在拖慢 AI 的效率，给出具体可执行的改进步骤。

---

## 为什么要做

**问题**: 非技术创始人用 AI 写代码，但不知道自己的协作方式有没有问题。AI 不会主动说"你的项目结构让我很难理解"或"你应该写个 CLAUDE.md"。

**现状**: Callout 审查代码质量（review）、审查功能价值（challenge）、审查项目阶段（guide）。但没有审查**人和 AI 的协作质量**。

**机会**: 市场上没有产品把"AI 协作最佳实践"变成自动化、可量化的反馈工具。

---

## 功能描述

### 输入
- 项目上下文（复用 `collectContext`）
- Git 历史（复用 `git.ts`）
- Callout 使用历史（`.callout/` 目录）

### 输出：6 维度诊断

#### 1. 上下文管理（Context）
- CLAUDE.md / .cursorrules 是否存在？内容是否有效（有项目结构、技术栈、规范）？
- README 是否清晰描述产品？
- 检测项：存在性 → 内容完整度 → 是否过期（vs 实际项目结构不一致）

#### 2. 验证习惯（Verification）
- 测试覆盖：testFiles / totalFiles 比率
- 类型系统：是否用 TypeScript / 类型注解
- Linter/Formatter：是否有 eslint/prettier/biome 配置
- 检测项：有没有验证 AI 输出的机制？

#### 3. 提交纪律（Commit Discipline）
- Git commit 粒度：平均每 commit 改多少文件？
- 是否有巨大单次提交（>20 files changed）？
- 是否有频繁 revert/fix 循环？
- 检测项：小步提交 = 可回滚 = AI 犯错代价低

#### 4. 依赖决策（Dependency Decisions）
- 依赖数量 vs 项目规模是否合理？
- 是否有重叠依赖（比如同时装了两个 HTTP client）？
- 核心依赖 vs 工具依赖比率
- 检测项：每加一个依赖 = 增加 AI 需要理解的上下文

#### 5. 项目卫生（Project Hygiene）
- .gitignore 是否合理？
- 是否有敏感文件暴露风险（.env, credentials）？
- 文件组织是否清晰（扁平 vs 嵌套过深）？
- 检测项：混乱的项目结构 = AI 输出质量下降

#### 6. Callout 使用（Callout Usage）
- 是否跑过 review？多久跑一次？
- Todo 完成率：open vs done
- MUST FIX 项是否有积压？
- 检测项：工具只有用了才有价值

### 输出格式

```
# AI Collaboration Coach: [project-name]

## Score: B+ (72/100)

### What you're doing well
- TypeScript enabled (AI makes fewer errors)
- Regular small commits (easy to rollback)
- 8 test files covering critical paths

### Top 3 actions to improve

1. [MUST] Create CLAUDE.md with project structure and conventions
   → Expected impact: AI output quality +40%
   → Run `callout init` to generate one automatically

2. [SHOULD] Add ESLint or Biome for automatic code quality checks
   → Expected impact: Catch 30% of AI mistakes before they reach git
   → Run: npm install -D @biomejs/biome && npx biome init

3. [SHOULD] Your last 5 commits average 12 files each. Break into smaller chunks.
   → Expected impact: Easier rollback when AI makes mistakes
   → Rule of thumb: 1 feature = 1 commit = <5 files

### Detailed Assessment
[6 维度展开...]

### After Coach: Add to Todo List
- Add each action item via `todo_add`
- Re-run `coach` after implementing changes to track improvement
```

---

## 架构

### 文件结构

```
src/
├── coach.ts              # 核心：信号收集 + 评分逻辑 + prompt 构建
├── prompts/coach.ts       # (不需要，逻辑全在 coach.ts)
└── handlers/analysis.ts   # 注册 coach tool（加到现有 handler）
test/
└── coach.test.ts          # 测试
```

### 复用现有基础设施

| 需要的数据 | 来源 | 已有？ |
|-----------|------|--------|
| 项目文件/技术栈/依赖 | `collectContext()` | ✅ |
| Git diff / 最近文件 | `git.ts` | ✅ |
| 审查历史 | `history.ts` | ✅ |
| Todo 状态 | `todo.ts` | ✅ |
| 阶段检测 | `guide.ts → detectStage()` | ✅ |
| 路径解析 / 输出包装 | `util.ts` | ✅ |
| Git commit 粒度分析 | **需新增** | ❌ |
| CLAUDE.md 内容质量评估 | **需新增**（prompt 内） | ❌ |

### 新增代码量估算

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/coach.ts` | ~150 行 | 信号收集 + 分数计算 + prompt 构建 |
| `src/git.ts` 扩展 | ~20 行 | 新增 `getCommitStats()` 函数 |
| `src/handlers/analysis.ts` | ~20 行 | 注册 coach tool |
| `test/coach.test.ts` | ~80 行 | 单元测试 |
| **总计** | **~270 行** | |

### 评分系统设计

```typescript
interface CoachSignal {
  dimension: 'context' | 'verification' | 'commits' | 'dependencies' | 'hygiene' | 'callout';
  name: string;
  score: number;        // 0-100
  weight: number;       // 该信号在维度内的权重
  status: 'good' | 'warning' | 'critical';
  action?: string;      // 具体改进步骤（critical/warning 必填）
  impact?: string;      // 预期效果
}
```

每个维度 0-100 分，6 个维度加权平均 = 总分。

权重分配：
- 上下文管理：25%（影响最大）
- 验证习惯：25%（安全网）
- 提交纪律：15%
- 依赖决策：10%
- 项目卫生：10%
- Callout 使用：15%

总分映射：A+ (90+) / A (80+) / B+ (70+) / B (60+) / C (50+) / D (<50)

---

## 实现路径

### V1: 静态分析（V0.4.4）
- 基于项目结构和配置的检测
- 不需要对话历史，不需要新的数据源
- **全部用已有基础设施**，只新增 commit 粒度分析
- 预计工作量：1 天

### V2: 历史趋势（V0.5+）
- 多次 coach 结果对比，显示改进趋势
- 持久化到 `.callout/coach-history.json`
- "上次 62 分 → 这次 78 分，主要改进：添加了 CLAUDE.md"

### V3: 行为模式分析（V1.0+）
- 分析 git 历史中的模式：频繁 revert = 提示词质量差
- 检测"同一文件反复修改"模式 = 可能在追错误方向
- 对接 Callout 云端，匿名汇总最佳实践数据

### V4: 个性化建议（V2.0+）
- 基于用户类型（非技术创始人 vs 独立开发者）定制建议
- 基于行业（SaaS vs 电商 vs AI 产品）定制检查项
- 社区贡献自定义检查规则

---

## 与现有工具的关系

```
guide  → "你在什么阶段，该问什么问题"     （项目方向）
review → "你的代码/架构有什么问题"         （代码质量）
coach  → "你跟 AI 的协作方式有什么问题"     （协作效率）
```

三者互补，不重叠：
- guide 看项目，review 看代码，coach 看人
- coach 可能建议"跑一次 review"（如果从未跑过）
- review 发现问题后，coach 帮你建立防止复发的习惯

---

## 自动触发规则（加入 CLAUDE.md 模板）

```markdown
### Auto-Coach
- **新项目首次打开**: 自动跑 coach，建立基线
- **每周一次**: 如果上次 coach 超过 7 天，建议重新跑
- **重大里程碑后**: 完成一个功能后，检查协作习惯是否退化
```

---

## 风险与注意事项

| 风险 | 缓解 |
|------|------|
| 评分体系主观 | V1 保持简单（存在性检测为主），V2 根据用户反馈调整权重 |
| 与 guide 职责模糊 | guide = 项目方向，coach = 协作习惯，严格区分 |
| 信息过载 | 只显示 Top 3 行动项，详细评估折叠在后面 |
| 评分焦虑 | 框架定位是"教练"不是"考试"，语气鼓励而非批判 |

---

## 成功指标

1. **用户跑 coach 后，下次跑分数提升** → 证明建议可执行
2. **coach 后 CLAUDE.md 创建率** → 证明最重要的建议被采纳
3. **重复使用率** → 每月跑 2+ 次 coach 的用户比例
