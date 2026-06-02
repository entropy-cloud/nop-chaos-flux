# 全量深度审计汇总：2026-06-02

> 审计范围: nop-chaos-flux monorepo (25+ packages, React 19 + Zustand + TypeScript 6.0)
> 审计基线: v1 / no compatibility burden / no transitional main-path allowances
> 执行模式: two-phase iterative deep-dig → independent review → sub-item review
> 日期: 2026-06-02

## 审计维度总览

| 维度          | 状态           | 初审发现                      | 复核后保留 | P1  | P2  | P3  | P4  |
| ------------- | -------------- | ----------------------------- | ---------- | --- | --- | --- | --- |
| 01 依赖图     | 已复核         | 零发现 → 2 复核新发现         | 2          | 1   | 1   | 0   | 0   |
| 02 模块职责   | 已复核         | 6 发现 → 复核拨正             | 2          | 0   | 0   | 1   | 1   |
| 03 API 表面   | 已复核         | 3 发现 → 0 保留               | 0          | 0   | 0   | 0   | 0   |
| 04 状态所有权 | 已复核+子项    | 3 → 5 (+2 子项)               | 5          | 1   | 2   | 2   | 0   |
| 05 响应式精度 | 已复核确认     | 0                             | 0          | 0   | 0   | 0   | 0   |
| 06 异步安全   | 已复核确认     | 0                             | 0          | 0   | 0   | 0   | 0   |
| 07 生命周期   | 已复核**反驳** | 零发现 → useLayoutEffect 疏漏 | 1          | 0   | 0   | 0   | 1   |
| 08 验证       | 已复核确认     | 0                             | 0          | 0   | 0   | 0   | 0   |
| 09 渲染器契约 | 已复核+子项    | 4 → 3 保留                    | 3          | 2   | 1   | 0   | 0   |
| 10 样式       | 已复核         | 6 → 5 保留                    | 5          | 0   | 0   | 4   | 1   |
| 11 UI 组件    | 已复核确认     | 0                             | 0          | 0   | 0   | 0   | 0   |
| 12 字段/插槽  | 已复核         | 4 发现 → 0 保留               | 0          | 0   | 0   | 0   | 0   |
| 13 类型安全   | 已复核确认     | 0                             | 0          | 0   | 0   | 0   | 0   |
| 14 测试覆盖   | 已复核         | 4 → 1 保留                    | 1          | 0   | 0   | 0   | 1   |
| 15 安全/性能  | 已复核         | 3 → 3 保留                    | 3          | 2   | 1   | 0   | 0   |
| 16 文档一致   | 已复核         | 2 → 2 保留                    | 2          | 0   | 1   | 1   | 0   |
| 17 命名       | 已复核         | 5 → 4 保留                    | 4          | 0   | 1   | 3   | 0   |
| 18 跨包一致   | 已复核         | 2 → 2 保留                    | 2          | 0   | 1   | 0   | 1   |
| 19 错误传播   | 已复核         | 3 → 1 保留                    | 1          | 0   | 0   | 1   | 0   |
| 20 可访问性   | 已复核         | 5 → 2 保留                    | 2          | 0   | 1   | 1   | 0   |

**总计保留发现: 33** (P1: 6, P2: 11, P3: 13, P4: 3)
**零发现维度 (复核确认):** 05, 06, 08, 11, 13

---

## P1 (关键) 发现汇总

| #     | 文件                                                    | 摘要                                                  | 维度 |
| ----- | ------------------------------------------------------- | ----------------------------------------------------- | ---- |
| 01-02 | `form-advanced/.../array-field-object-items.test.tsx:4` | packages 反向依赖 apps/playground                     | 01   |
| 04-02 | `host-data.ts:195-233`                                  | report-designer 双 workbook 真源                      | 04   |
| 09-02 | `crud-renderer.tsx:232-310`                             | 伪造 TableRenderer RendererComponentProps             | 09   |
| 09-03 | `use-surface-renderer.ts:13-25`                         | dispatch 私有字段替代标准 hooks                       | 09   |
| 15-02 | `source-compiler.ts`/`source-registry.ts`               | stopWhen 编译表达式被降回字符串，轮询热路径重新编译   | 15   |
| 15-03 | `formula-data-source-controller.ts:48-50`               | stop/reset 不清 started flag，controller 静默不可恢复 | 15   |

## P2 (重要) 发现汇总

| #       | 文件                                                      | 摘要                                                                             | 维度 |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | ---- |
| 01-01   | `word-editor/__tests__/use-word-editor-save.test.tsx:25`  | 测试跨包导入内部路径                                                             | 01   |
| 04-01   | `spreadsheet/use-editing.ts:22-27`                        | inline edit session 由 renderer-local state 持有                                 | 04   |
| 04-03   | `spreadsheet/bridge.ts:13-27`                             | host bridge 把 editing 从快照抹掉                                                | 04   |
| 04-02-A | `host-data.ts`                                            | createHostData 与 buildReportDesignerScopeData workbook copy-vs-reference 不一致 | 04   |
| 09-04   | `use-surface-renderer.ts:179-197`                         | 事件处理器零参数调用                                                             | 09   |
| 15-01   | `api-data-source-controller-state.ts:127-154`             | stopWhen null-member 静默继续 polling (降级自 P1)                                | 15   |
| 16-02   | `report-designer/design.md`                               | document-code gap about workbook scope data                                      | 16   |
| 17-04   | 多 renderer 包                                            | dataSource vs source 双命名                                                      | 17   |
| 17-01   | `flux-core/src/types.ts`, `flux-action-core/src/types.ts` | RendererEnv 类型命名不统一 (降级自 P2)                                           | 17   |
| 18-01   | `flow-designer-core/src/core.ts`                          | 自定义闭包状态替代 zustand/vanilla                                               | 18   |
| 20-01   | `form-renderer.tsx`                                       | 提交失败后焦点不回到第一错误字段 (降级自 P1)                                     | 20   |

## 按包分发的发现累积

| 包                           | P1  | P2  | P3  | P4  | 总  |
| ---------------------------- | --- | --- | --- | --- | --- |
| flux-core                    | 0   | 0   | 1   | 0   | 1   |
| flux-runtime                 | 2   | 0   | 1   | 0   | 3   |
| flux-react                   | 0   | 0   | 0   | 0   | 0   |
| flux-compiler                | 1   | 0   | 0   | 0   | 1   |
| flux-renderers-basic         | 1   | 1   | 0   | 0   | 2   |
| flux-renderers-data          | 1   | 0   | 0   | 0   | 1   |
| flux-renderers-form-advanced | 1   | 0   | 0   | 0   | 1   |
| spreadsheet-renderers        | 0   | 2   | 2   | 0   | 4   |
| report-designer-renderers    | 1   | 2   | 0   | 0   | 3   |
| flow-designer-core           | 0   | 1   | 0   | 0   | 1   |
| word-editor-renderers        | 0   | 1   | 0   | 0   | 1   |
| apps/playground              | 1   | 0   | 0   | 0   | 1   |
| docs/                        | 0   | 1   | 1   | 0   | 2   |
| 跨包/全局                    | 0   | 3   | 3   | 0   | 6   |

---

## 审计方法论质量评估

独立复核发现了显著的初审质量问题：

| 问题                                                      | 影响维度                       | 严重性                          |
| --------------------------------------------------------- | ------------------------------ | ------------------------------- |
| 幻觉文件/路径 (引用不存在的代码)                          | 02, 03, 10, 12, 14, 17, 19, 20 | **高** — 影响 40% 维度          |
| 包列表过时 (25 listed vs 33 actual)                       | 03 (全局表格)                  | **高** — 表格 32% 不准确        |
| 行数误差 (core.ts: 1200+ vs 616)                          | 02, 18                         | **中** — 高估 2x                |
| useLayoutEffect 漏计数 (0 vs 25+)                         | 07                             | **高** — 零发现声明的根本性错误 |
| 代码模式描述不准确 (skipFieldFrame 不存在)                | 12                             | **中** — 模式名完全错误         |
| 包归属错误 (value-adapter 在 flux-core 不在 flux-runtime) | 19                             | **低** — 路径错误不影响发现实质 |
| 测试名和文件不存在 (E2E)                                  | 14                             | **高** — 指向已删除的测试       |

**建议: 审计工具链的扫描脚本需要与实时文件系统验证对齐，在报告结果前确认文件存在。**

## 关键架构债务

1. **CrudRenderer 架构债 (09-02 P1)**: 伪造 `RendererComponentProps`，使用 4 个 `as unknown as` 强制转换绕过类型系统。编译器应分解 CRUD→Table 关系。
2. **report-designer 双 workbook 真源 (04-02 P1)**: `buildReportDesignerScopeData` 和 `createHostData` 发布两条 workbook 路径，其 copy-vs-reference 语义使消费者难以推断。
3. **stopWhen 编译表达式被丢弃 (15-02 P1)**: 编译后的表达式在 `stopWhen` 轮询路径上被降回字符串，导致每次轮询重新编译。
4. **formula data-source stop/reset 死状态 (15-03 P1)**: `stop()`/`reset()` 不重置 `started` flag，违背 restartable contract。
5. **flow-designer-core 状态管理不一致 (18-01 P2)**: 使用自定义闭包状态而非 monorepo 标准 zustand/vanilla，1200+ 行（现 616 行）状态管理。
6. **表单提交后焦点管理缺失 (20-01 P2)**: 辅助技术用户提交失败后需手动滚动定位首错。
7. **useSurfaceRenderer dispatch 私有字段 (09-03 P1)**: 5 分钟即可替换为标准 hooks，但代表对 hook API 的系统性绕过。
8. **packages→apps 反向依赖 (01-02 P1)**: 测试文件从 apps/playground 反向导入，破坏 monorepo 架构独立性。

## 零发现维度 (复核确认)

以下维度完全合规，无任何报告事项：

- **05 响应式精度**: 所有订阅路径符合 per-path P7 语义
- **06 异步安全**: AbortController/vac-promise/catch+report 全覆盖
- **08 验证**: 5 条 owner-docs 规则全部遵循
- **11 UI 组件**: `@nop-chaos/ui` 使用一致，无不当原始 HTML
- **13 类型安全**: 61 处 `any` 全部在合理动态边界内
