# 深度审核汇总报告 — B 部分（运行时与状态）

## 审核范围

- **执行的维度**: 04（状态所有权）、05（响应式订阅精度）、06（异步模式与取消安全）、07（生命周期与副作用归属）、08（验证系统一致性）
- **覆盖的包**: flux-runtime、flux-react、flux-renderers-form、flux-renderers-form-advanced、flux-renderers-data、flux-renderers-basic、flux-code-editor、flow-designer-core、flow-designer-renderers、spreadsheet-renderers、report-designer-core、report-designer-renderers、word-editor-renderers、nop-debugger
- **审核日期**: 2026-04-20
- **执行方式**: 每个维度 1 个初审子 agent + 1 个维度复核子 agent + P1/P2 项逐项独立复核子 agent，共 ~25 个子 agent

## 复核统计

- **初审发现总数**: 44
- **已独立复核条目数**: 44
- **保留**: 30
- **降级**: 9
- **驳回**: 5

---

## P1 清单（按文件分组）

| # | 维度 | 文件 | 问题 | 状态 |
|---|------|------|------|------|
| 1 | 07 | `flux-renderers-basic/src/dynamic-renderer.tsx:29-57` | DynamicRenderer 使用 mountedRef 布尔标记存在竞态条件：当 schemaApi 快速变化时，过期异步加载结果可覆盖正确结果。应替换为 AbortController | 已通过3次独立复核 |

---

## P2 清单（按文件分组）

| # | 维度 | 文件 | 问题 | 状态 |
|---|------|------|------|------|
| 1 | 05 | `flux-renderers-form/src/field-utils.tsx:230` | useFieldPresentation 通过 useCurrentFormState 订阅完整 FormStoreState。equalityFn 缓解了重渲染，但 O(n) selector 唤醒仍存在 | 已通过3次复核 |
| 2 | 05 | `flux-renderers-form/src/field-utils.tsx:58` | useBoundFieldValue 订阅完整 store 只读单个字段值。Object.is 对原始值有效 | 已通过3次复核 |
| 3 | 05 | `flux-react/src/field-frame.tsx:64` | FieldFrame dynamicRequired 订阅完整 store，但仅对有动态必填规则的字段激活（conditional enablement） | 已通过3次复核 |
| 4 | 06 | `flux-react/src/use-source-value.ts:37` | useSourceValue 创建 AbortController 但未将 signal 转发给 executeSource。executeSource API 不接受 AbortSignal | 已通过3次复核 |
| 5 | 06 | `flux-react/src/node-source-prop-controller.ts:84` | 与#4 共享根因：executeSource API 缺口导致 signal 无法传递 | 已通过3次复核 |
| 6 | 06 | `report-designer-core/src/core-dispatch.ts:183-263` | 报表设计器预览/导入/导出无取消机制。report-designer-core 中零 AbortController 使用 | 已通过3次复核 |

---

## P3 清单（摘要，详见各维度文件）

共 23 项 P3 级别发现，分布在 5 个维度中。主要类别：

| 维度 | P3 数量 | 主要类别 |
|------|---------|---------|
| 04 | 9 | ref 桥接技术债务(3)、合理 UI 状态(4)、不完整实现(2) |
| 05 | 0 | — |
| 06 | 2 | refreshDerivedState 无 stale guard、ELK 纯函数无取消 |
| 07 | 5 | ChartRenderer 效果拆分(1)、ref 依赖(1)、魔术键(1)、hidden field 重复(1)、ref-sync(1) |
| 08 | 7 | 路径所有权校验(1)、并行验证(1)、fire-and-forget 验证(2)、闭包扩展(1)、system reason 注释(1)、ValidationScopeRuntime(1) |

---

## 高频问题文件（出现在多个维度中的文件）

| 文件 | 涉及维度 | 发现数 |
|------|---------|-------|
| `flux-renderers-data/src/crud-renderer.tsx` | 04, 07 | 3 |
| `flux-renderers-form/src/field-utils.tsx` | 04, 05 | 4 |
| `flux-react/src/field-frame.tsx` | 05 | 1 |
| `report-designer-core/src/core-dispatch.ts` | 06 | 1 |
| `report-designer-renderers/src/inspector-shell-renderer.tsx` | 04, 05 | 2 |

---

## 跨维度模式（多个维度报告的同类问题）

### 1. executeSource API 缺口（维度 06 + 07）
`RendererRuntime.executeSource` 不接受 `AbortSignal`，导致两个 React hooks（useSourceValue、node-source-prop-controller）和 DynamicRenderer 无法真正取消网络请求。修复需要在 flux-core 类型契约中添加 signal 参数。

### 2. report-designer-core 异步基础设施缺失（维度 06）
整个 report-designer-core 包中零 AbortController 使用。预览、导入、导出、refreshDerivedState 都缺少取消/stale guard。这是一个仍在开发中的 domain 包，异步模式尚未收敛。

### 3. ref 桥接 store 数据模式（维度 04）
array-editor、key-value、condition-builder 三个渲染器都使用 `useRef` + `useEffect` 桥接 store 数据，用于 registration API 的同步 getValue() 回调。这是已知的技术债务，根因是 form registration API 需要同步读取能力。

### 4. useCurrentFormState 全 store 订阅（维度 05）
`useCurrentFormState` 使用完整 store 广播而非 per-path subscription。影响被 equalityFn 和 conditional enablement 缓解，但 O(n) selector 唤醒成本仍在。根因是 `setValue` 不调用 `notifyPath`，导致值变更只能通过全 store 订阅感知。

---

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- 文件大小超过 700 行由 `pnpm check:oversized-code-files` 和 ESLint `max-lines` 规则拦截
- React hooks exhaustive-deps 规则覆盖了大部分依赖项问题
- TypeScript strict mode 捕获了类型层面的不一致

---

## 建议新增的自动化检查

| 建议检查 | 检测目标 | 实现方式 |
|---------|---------|---------|
| 禁止 `mountedRef` / `isMounted` 模式 | 竞态条件 | 自定义 ESLint 规则：检测 useRef(true) + useEffect 内 async 模式 |
| executeSource 调用缺少 signal | 资源泄漏 | 暂不实现——需要先修改 API 契约 |
| report-designer-core 异步操作缺少取消 | 域包质量 | 暂不实现——仍在开发中 |

---

## 可暂缓项（有问题但 ROI 暂时不高）

- 维度 04 的 9 个 P3 项（ref 桥接、合理 UI 状态、不完整实现）
- 维度 07 的 5 个 P3 项（效果拆分、ref 依赖、魔术键等）
- 维度 08 的 7 个 P3 项（Phase 3 功能、注释补充等）
- 维度 06 的 2 个 P3 项（ELK 纯函数、refreshDerivedState stale guard）

---

## 误报排除清单（看起来像问题但不建议动）

| 原始发现 | 排除理由 |
|---------|---------|
| D05: useSurfaceScopeSnapshot 恒等选择器 | 设计意图：Surface 全量脏标记，返回值被忽略 |
| D05: useFieldPresentation 新闭包 | useSyncExternalStoreWithSelector 不依赖 selector 引用稳定性 |
| D07: ReportDesignerPage refreshFieldSources on mount | 构造→effect 触发异步初始化是 React 标准模式 |
| D08: sourceKind 扩展了文档定义 | 代码类型定义本身即规范，应更新文档而非代码 |
| D08: CompiledValidationNodeKind 是子集 | Phase 3 规划功能，当前实现正确 |
| D08: 编译时无 owner boundary 分区 | Phase 2+ 架构增强，当前 childContracts 机制足够 |
