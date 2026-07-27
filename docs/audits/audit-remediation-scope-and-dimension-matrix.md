# 审计-修复范围与维度矩阵

> 来源：`docs/skills/audit-remediation-roadmap-authoring-prompt.md` 步骤 1
> 生成时间：2026-07-27
> 复杂度数据基于仓库实际统计

## 包簇复杂度评估

| 包簇            | 包数 | 源文件数 | 复杂度等级 | 审计策略                                                         |
| --------------- | ---- | -------- | ---------- | ---------------------------------------------------------------- |
| core-cluster    | 4    | 204      | S          | 按包拆分（flux-core / flux-formula+compiler / flux-action-core） |
| runtime-cluster | 3    | 165      | S          | 按包拆分（flux-runtime / flux-react / flux-bundle）              |
| basic-renderers | 4    | 261      | S          | 按包拆分（basic / form+form-advanced / data）                    |
| designer        | 4    | 170      | S          | 按包拆分（flow-designer / report-designer）                      |
| foundation      | 6    | 209      | A          | 按包簇单工作项（库/工具类，低行为风险）                          |
| scheduling      | 1    | 153      | A          | 单工作项（已有密集审计，仅尾随）                                 |
| office          | 4    | 133      | B          | 2-3 簇合并                                                       |
| content         | 2    | 85       | B          | 2-3 簇合并                                                       |
| ai              | 1    | 62       | B          | 单工作项（已有密集审计）                                         |
| mobile          | 1    | 20       | C          | 与 content 合并                                                  |

## 审计维度 × 包簇覆盖矩阵

### 来源 A：已有 skill 覆盖

| 维度                       | 覆盖范围      | core | runtime | basic-renderers | content | mobile     | scheduling | ai               | designer | office | foundation |
| -------------------------- | ------------- | ---- | ------- | --------------- | ------- | ---------- | ---------- | ---------------- | -------- | ------ | ---------- |
| 依赖图与包边界             | 跨包引用      | ❓   | ❓      | ❓              | ❓      | ❓         | ✅已审计   | ✅已审计         | ❓       | ❓     | ❓         |
| 模块边界合规               | 全域          | ❓   | ❓      | ❓              | ❓      | ❓         | ❓         | ❓               | ❓       | ❓     | ❓         |
| Renderer 定义正确性        | 全 definition | ❓   | N/A     | ❓              | ❓      | ✅已审计   | ❓         | ✅已审计         | ❓       | ❓     | N/A        |
| 代码质量与实现质量         | 目标包        | ❓   | ❓      | ❓              | ❓      | ⚠️有未闭包 | ⚠️有未闭包 | ⚠️有未闭包(P1×2) | ❓       | ❓     | ❓         |
| React 19 最佳实践          | 全 React 组件 | N/A  | ❓      | ❓              | ❓      | ❓         | ⚠️有未闭包 | ❓               | ❓       | ❓     | ❓         |
| 单元测试逻辑与契约覆盖     | 目标包        | ❓   | ❓      | ❓              | ❓      | ❓         | ⚠️有未闭包 | ⚠️有未闭包       | ❓       | ❓     | ❓         |
| 复杂交互 renderer 可操作性 | designer/复杂 | N/A  | N/A     | ❓              | N/A     | ✅已审计   | ⚠️有未闭包 | ⚠️有未闭包       | ❓       | ❓     | N/A        |
| UX 设计模式                | 任意表面      | N/A  | N/A     | ❓              | ❓      | ❓         | ⚠️有未闭包 | ❓               | ❓       | ❓     | N/A        |
| 文档准确性                 | docs/         | ❓   | ❓      | ❓              | ❓      | ❓         | ⚠️有未闭包 | ⚠️有未闭包       | ❓       | ❓     | ❓         |

### 来源 B：残留风险与工具扫描

| 维度                      | 方法                                           | core | runtime | basic-renderers | content | mobile | scheduling | ai           | designer | office | foundation |
| ------------------------- | ---------------------------------------------- | ---- | ------- | --------------- | ------- | ------ | ---------- | ------------ | -------- | ------ | ---------- |
| Schema 校验有效性         | 全域 grep + schema-file-validator              | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ❓           | ❓       | ❓     | ❓         |
| Runtime 裸 schema 读取    | `check:audit-runtime-raw-schema-reads`         | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ✅0 hits     | ❓       | ❓     | ❓         |
| FieldFrame 绕过           | `check:audit-fieldframe-bypasses`              | N/A  | ❓      | ❓              | ❓      | ❓     | ❓         | ❓           | N/A      | N/A    | N/A        |
| 异步失败路径              | `check:audit-async-failure-paths`              | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ⚠️1 P2       | ❓       | ❓     | ❓         |
| 硬编码类型分发            | `check:audit-hardcoded-type-dispatch`          | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ❓           | ❓       | ❓     | ❓         |
| Renderer 标记缺失         | `check:audit-missing-renderer-markers`         | N/A  | N/A     | ❓              | ❓      | ❓     | ❓         | ✅0 hits     | ❓       | ❓     | N/A        |
| 测试全局泄漏              | `check:audit-test-global-leaks`                | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ❓           | ❓       | ❓     | ❓         |
| Mutation 测试覆盖         | `audit:mutants`                                | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ❓           | ❓       | ❓     | ❓         |
| 性能可疑点                | `check:audit-performance-suspects`             | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ❓           | ❓       | ❓     | ❓         |
| 样式可疑点                | `check:audit-styling-suspects`                 | N/A  | N/A     | ❓              | ❓      | ❓     | ⚠️P2残留   | ✅16FP       | ❓       | ❓     | ❓         |
| XSS / 动态执行路径        | 抽样 HTML-passing                              | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ✅0 findings | ❓       | ❓     | ❓         |
| 非 retained renderer 引用 | `check:audit-non-retained-renderer-references` | N/A  | N/A     | ❓              | ❓      | ❓     | ❓         | ❓           | ❓       | ❓     | N/A        |

### 来源 C：Flux 框架特定风险维度

| 维度                    | 方法                                | core | runtime | basic-renderers | content | mobile | scheduling | ai     | designer | office | foundation |
| ----------------------- | ----------------------------------- | ---- | ------- | --------------- | ------- | ------ | ---------- | ------ | -------- | ------ | ---------- |
| 层间契约漂移            | 对照 quick-reference.md 与 index.ts | ❓   | ❓      | ❓              | ❓      | N/A    | ❓         | ❓     | ❓       | ❓     | N/A        |
| Renderer 定义注册完整性 | 对照 amis-baseline-matrix.md        | N/A  | N/A     | ❓              | ❓      | ✅done | ✅done     | ✅done | ❓       | ❓     | N/A        |
| Fragment/Region 渲染    | 抽样审查                            | N/A  | ❓      | ❓              | ❓      | N/A    | ❓         | ❓     | ❓       | ❓     | N/A        |
| Action 派发链路         | 抽样核心 action                     | ❓   | ❓      | ❓              | ❓      | N/A    | ❓         | ❓     | ❓       | ❓     | N/A        |
| i18n 完整性             | 全域 grep i18n key                  | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ❓     | ❓       | ❓     | ❓         |
| CI/静态检查激活         | 跑工具+核对配置                     | ❓   | ❓      | ❓              | ❓      | ❓     | ❓         | ❓     | ❓       | ❓     | ❓         |

## 未闭包发现清单（步骤 2）

### AI 包（`packages/flux-renderers-ai`）

| Finding ID   | 严重性 | 描述                                               | 来源                   | 状态     |
| ------------ | ------ | -------------------------------------------------- | ---------------------- | -------- |
| AI-P1-1      | P1     | `deleteConversation` post-await stale-closure race | 2026-07-25 multi-audit | 未处理   |
| AI-P1-2      | P1     | `ai-citations` HTML 双编码显示损坏                 | 2026-07-25 multi-audit | 未处理   |
| AI-P2-1 to 6 | P2     | 共 6 个 P2（非本 roadmap 范围）                    | 2026-07-25 multi-audit | deferred |

### Scheduling 包（`packages/flux-renderers-scheduling`）

| Finding ID | 严重性 | 描述                          | 来源                   | 状态     |
| ---------- | ------ | ----------------------------- | ---------------------- | -------- |
| SCHED-F73  | P1     | Kanban DnD test silent no-op  | 2026-07-23 multi-audit | 未处理   |
| SCHED-P2-x | P2     | 11 个 P2（非本 roadmap 范围） | 2026-07-23 multi-audit | deferred |

### 汇总

| 严重性 | 数量                     |
| ------ | ------------------------ |
| P0     | 0                        |
| P1     | 3（AI:2 + Scheduling:1） |
| P2+    | ~20+                     |
