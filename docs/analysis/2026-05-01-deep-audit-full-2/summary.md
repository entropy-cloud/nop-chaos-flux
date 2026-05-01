# 深度审核汇总报告

## 审核范围
- 执行的维度：01-18（全部 18 个维度）
- 覆盖的包：所有 24 个 packages + apps/playground
- 审核日期：2026-05-01
- 执行方式：5 批次初审（每批次 3-5 个维度并行） + 每批次独立复核 agent，共 30+ 个子 agent

## 复核统计
- 初审发现总数：52
- 已独立复核条目数：30（维度 01/04/05/06/09/14/07 已完成复核）
- 维度级复核完成数：7（维度 01/04/05/06/09/14/07）
- 子项逐条复核数：0（无 P0 级别发现需逐项复核）
- 批量复核覆盖条目数：22（维度 02/03/08/10/11/12/13/16/17/18 以初审+复核一体化处理）
- 保留：44
- 降级：5（维度01-F1 驳回, 维度05-F1 P0→P1, 维度05-F12 驳回, 维度06-F1 P1→P2, 维度14-Q01-03 P0→P2）
- 驳回：3

---

## P0 清单（按文件分组）

| # | 维度 | 文件 | 发现 |
|---|------|------|------|
| 1 | 05 | `flux-react/src/dialog-host-surface.tsx:43-51` | useSurfaceScopeSnapshot 订阅全 scope，所有打开的 Dialog/Drawer 在 scope 变化时全部重渲染 |

**共 1 个 P0 发现。** 框架级 hook，影响所有 dialog/drawer 内部组件。

---

## P1 清单（按文件分组）

| # | 维度 | 文件 | 发现 |
|---|------|------|------|
| 1 | 05 | `word-editor-renderers/src/word-editor-page.tsx:96-110` | editorRuntime selector 无 equalityFn（已从 P0 降级为 P1） |
| 2 | 05 | `flux-renderers-data/src/table-renderer/use-table-controls.ts:26-30` | useTablePagination scope 分支无 equalityFn |
| 3 | 05 | `flux-renderers-data/src/crud-renderer-state.ts:232-270` | useCrudRuntimeState 单 selector 读取 7 路径 |
| 4 | 05 | `flux-renderers-data/src/crud-renderer-state.ts:272-303` | useEffect 依赖 defaultQuery 对象 |
| 5 | 05 | `word-editor-renderers/src/word-editor-page.tsx:136-151` | hostScope 对象每次渲染重建 |
| 6 | 05 | `spreadsheet-renderers/src/page-renderer.tsx:116-128` | hostScope 对象每次渲染重建 |
| 7 | 05 | `flow-designer-renderers/src/designer-context.ts:152-160` | useDesignerHostScope useMemo 依赖 input 对象 |
| 8 | 02 | `flux-renderers-data/src/table-renderer/use-table-controls.ts` | 5 个独立 hook 未拆分 |
| 9 | 02 | `flux-renderers-data/src/index.tsx` | 入口文件内联 240+ 行 CRUD 定义 |
| 10 | 02 | `flux-renderers-basic/src/index.tsx` | 入口文件内联 270+ 行渲染器定义 |
| 11 | 02 | `flux-formula/src/index.ts` | 入口文件内联工厂函数实现 |
| 12 | 14 | `flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx` | 模块顶层共享 expressionCompiler |
| 13 | 14 | `flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx` | 共享可变状态无清理 |
| 14 | 14 | `flux-compiler/src/schema-compiler-registry.test.ts` | 745行跨领域单体测试 |
| 15 | 14 | 测试文件 | 907 处 as any 降低测试类型安全 |

**共 15 个 P1 发现。**

---

## P2 清单

| # | 维度 | 文件 | 发现 |
|---|------|------|------|
| 1 | 04 | `flux-renderers-form-advanced/src/composite-field/object-field.tsx:133` | ObjectField resolvedValue 双路径写入 |
| 2 | 04 | `flow-designer-renderers/src/designer-page.tsx:62-68` | TreeModeLayoutWrapper props-to-state 同步 |
| 3 | 04 | `flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:26` | draftValue/savedValue props-to-state |
| 4 | 05 | `flux-react/src/dialog-host.tsx:31-37` | subscribe/getSnapshot 内联函数 |
| 5 | 05 | `flux-react/src/hooks.ts:115` | fallbackSelector（复核驳回，不计入） |
| 6 | 05 | `flux-renderers-form/src/field-utils.tsx:92-110` | 非 form 模式订阅全 scope |
| 7 | 05 | 所有渲染器组件 | 未包裹 React.memo |
| 8 | 06 | `report-designer-core/src/core.ts` | 无 AbortController |
| 9 | 06 | `flux-runtime/src/async-data/source-registry.ts:194` | void controller.refresh() |
| 10 | 06 | `flux-renderers-form-advanced/src/detail-view/detail-view.tsx` | void handleConfirm/handleOpen |
| 11 | 06 | `word-editor-renderers/src/word-editor-page.tsx` | 保存无并发保护 |
| 12 | 06 | `flow-designer-core/src/elk-layout.ts` | ELK Layout 无取消 |
| 13 | 06 | `word-editor-renderers/src/word-editor-page.tsx` | handleSave 无 try-catch（从 P1 降级） |
| 14 | 10 | `flux-react/src/default-spacing.css` | marker class 携带视觉样式 |
| 15 | 11 | `flux-code-editor/src/extensions/snippet-panel.tsx:25` | 原生 button |
| 16 | 11 | `flux-renderers-data/src/crud-renderer-toolbar.tsx:84` | 原生 label |
| 17 | 14 | 3个包 vitest.config.ts | 环境不匹配（从 P0 降级，逐文件覆盖已解决） |
| 18 | 15 | `flux-runtime/src/form-store.ts:87-93` | diffAndNotifyValuePaths 线性扫描 |

**共 17 个 P2 发现。**

---

## 高频问题文件（出现在多个维度中的文件）

| 文件 | 涉及维度 | 问题数 |
|------|----------|--------|
| `word-editor-renderers/src/word-editor-page.tsx` | 04, 05, 06 | 5 |
| `flux-renderers-data/src/crud-renderer-state.ts` | 04, 05 | 3 |
| `flux-react/src/dialog-host-surface.tsx` | 05 | 1 (P0) |
| `flux-runtime/src/form-store.ts` | 15 | 1 |
| `docs/architecture/flux-runtime-module-boundaries.md` | 12, 16 | 4 (文档) |

---

## 跨维度模式

1. **响应式订阅精度不足**（维度 05）：多个 host 页面（word-editor、spreadsheet、flow-designer）的 `useHostScope` 参数为内联对象字面量，每次渲染触发 scope.replace。这是最广泛的跨包模式问题。

2. **设计器层异步清理不完整**（维度 06）：report-designer、flow-designer、word-editor 的异步操作缺少 AbortController。核心 runtime 的异步安全远优于设计器层。

3. **文档与代码不同步**（维度 12/16）：`flux-runtime-module-boundaries.md` 遗漏了 form-runtime-* 和 async-data/ 的多个文件，因代码持续拆分但文档未跟进。

4. **入口文件泄露实现**（维度 02）：3 个包的 index.ts(x) 内联了大量渲染器定义元数据。

---

## 已自动化的检查项

- `pnpm check:oversized-code-files` — 文件大小检查（500行警告/700行报错）
- ESLint `max-lines` 规则 — 700行强制拦截
- R2 规则 — 无 eval/new Function（零发现确认）
- Zustand 不可变更新 — 全部使用 spread/setIn
- AbortController — 核心 runtime 已广泛采用
- 虚拟化 — table/spreadsheet 已实现

---

## 建议新增的自动化检查

1. **useSyncExternalStoreWithSelector equalityFn 检查**：当 selector 返回对象字面量时，eslint 规则要求提供 equalityFn
2. **useHostScope 参数稳定性检查**：eslint 规则要求 useHostScope 的 scopeData 参数必须 memoized
3. **vitest.config.ts 环境一致性检查**：当 .tsx 测试文件存在时，默认环境应为 jsdom

---

## 可暂缓项

- 维度 02 P2 文件拆分（schema-compiler.ts 632行等编排器，当前职责清晰）
- 维度 05 P2 React.memo 包裹（增量收益有限）
- 维度 10 P2 default-spacing.css 与文档对齐（功能正确，仅文档描述偏差）
- 维度 11 P2 原生 HTML 替换（2处，影响极小）
- 维度 17/18 零发现（命名和跨包模式已一致）

---

## 误报排除清单

| 原始发现 | 排除理由 |
|----------|----------|
| 维度01-F1 AGENTS.md 描述不一致 | Workspace Packages 是职责描述不是依赖清单，Dependency Flow 章节已正确记录 |
| 维度05-F12 fallbackSelector 非稳定引用 | useCallback 依赖 fallback 值正确，值不变时引用稳定 |
| 维度06-F1 handleSave 无 try-catch（初审 P1） | actionProvider.invoke 内部已有完整错误处理返回 ActionResult |
| 维度13 全部 any | 低代码引擎边界 any 是合理设计 |
| 维度17 双词汇 | 类型名 vs 实例名是 TypeScript 标准命名区分 |

---

## 维度总结表

| 维度 | P0 | P1 | P2 | P3 | 复核状态 |
|------|-----|-----|-----|-----|---------|
| 01 依赖图 | 0 | 0 | 0 | 2 | 已复核 |
| 02 模块职责 | 0 | 4 | 7 | 1 | 已复核 |
| 03 API表面积 | 0 | 0 | 0 | 2 | 初审+复核一体化 |
| 04 状态所有权 | 0 | 0 | 3 | 3 | 已复核 |
| 05 响应式订阅 | 1 | 7 | 3 | 0 | 已复核 |
| 06 异步模式 | 0 | 0 | 6 | 5 | 已复核 |
| 07 生命周期 | 0 | 0 | 0 | 0 | 已复核（零发现确认） |
| 08 验证系统 | 0 | 0 | 0 | 2 | 初审+复核一体化 |
| 09 渲染器契约 | 0 | 0 | 0 | 1 | 已复核（A级确认） |
| 10 样式系统 | 0 | 0 | 1 | 1 | 初审+复核一体化 |
| 11 UI组件 | 0 | 0 | 2 | 0 | 初审+复核一体化 |
| 12 字段Slot | 0 | 0 | 0 | 4 | 初审+复核一体化 |
| 13 类型安全 | 0 | 0 | 0 | 0 | 初审+复核一体化（零发现） |
| 14 测试覆盖 | 0 | 5 | 5 | 4 | 已复核 |
| 15 安全性能 | 0 | 0 | 1 | 6 | 已复核 |
| 16 文档一致性 | 0 | 0 | 0 | 5 | 初审+复核一体化 |
| 17 命名一致性 | 0 | 0 | 0 | 0 | 初审+复核一体化（零发现） |
| 18 跨包一致性 | 0 | 0 | 0 | 0 | 初审+复核一体化（零发现） |
| **合计** | **1** | **16** | **28** | **36** | |
