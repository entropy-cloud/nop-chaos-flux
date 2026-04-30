# 深度审核汇总报告 — B + C 部分（运行时/状态 + 渲染器/UI）

## 审核范围

- **执行的维度**: 04-08（B 部分：运行时与状态）+ 09-12（C 部分：渲染器与 UI）
- **覆盖的包**: 全部 packages
- **审核日期**: 2026-04-20
- **执行方式**: 每个维度 1 个初审子 agent + 1 个维度复核子 agent + P1/P2 项逐项独立复核，共 ~40 个子 agent

## 复核统计

- **初审发现总数**: 72（B 部分 44 + C 部分 28）
- **已独立复核条目数**: 72
- **保留**: 47
- **降级**: 15
- **驳回**: 10

---

## P0 清单

无。

## P1 清单（按文件分组）

| #   | 维度 | 文件                                                  | 问题                                                                                  | 状态   |
| --- | ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| 1   | 07   | `flux-renderers-basic/src/dynamic-renderer.tsx:29-57` | DynamicRenderer mountedRef 竞态条件（**已修复**：改为 AbortController + signal 传递） | 已修复 |

## P2 清单（按维度分组）

### B 部分（运行时与状态）

| #   | 维度 | 文件                                                                      | 问题                                                                |
| --- | ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | 05   | `flux-renderers-form/src/field-utils.tsx:230`                             | useFieldPresentation 订阅完整 store（equalityFn 缓解）              |
| 2   | 05   | `flux-renderers-form/src/field-utils.tsx:58`                              | useBoundFieldValue 订阅完整 store                                   |
| 3   | 05   | `flux-react/src/field-frame.tsx:64`                                       | FieldFrame dynamicRequired 订阅完整 store（conditional enablement） |
| 4   | 06   | `flux-react/src/use-source-value.ts:37`                                   | useSourceValue signal 未转发给 executeSource（**已修复**）          |
| 5   | 06   | `flux-react/src/node-source-prop-controller.ts:84`                        | 同上（**已修复**）                                                  |
| 6   | 06   | `report-designer-core/src/core-dispatch.ts:183-263`                       | 报表设计器预览/导入/导出无取消机制                                  |
| 7   | 07   | `flux-renderers-form-advanced/src/variant-field/variant-field.tsx:98-128` | runDetectVariantAction 异步 useCallback 无取消（扫描新增）          |

### C 部分（渲染器与 UI）

| #   | 维度 | 文件                                                                   | 问题                                                    |
| --- | ---- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| 7   | 09   | `flux-renderers-data/src/crud-renderer.tsx:218,224,230`                | 内部区域用 nop-\* class（应仅用 data-slot）             |
| 8   | 09   | `flux-renderers-form-advanced/src/variant-field/variant-field.tsx:270` | component as any                                        |
| 9   | 09   | `flux-renderers-form-advanced/src/detail-view/detail-view.tsx:288`     | component as any                                        |
| 10  | 09   | `flux-renderers-form-advanced/src/detail-view/detail-field.tsx:214`    | component as any                                        |
| 10  | 09   | `detail-view/detail-field` (2 处)                                      | dispatch(xxx as any) 掩盖 undefined 风险（扫描新增）    |
| 11  | 10   | 15 个 widget 渲染器（见 10-styling.md 完整列表）                       | 缺少 root marker class（扫描扩展 5→15）                 |
| 12  | 10   | `flow-designer-renderers/src/designer-node-appearance.ts`              | 硬编码 15 个 hex 颜色值（扫描新增）                     |
| 15  | 10   | `apps/playground/src/flow-designer-nodes.css`                          | BEM + 硬编码颜色（playground 层）                       |
| 16  | 12   | 14 处 value-or-region 声明不完整（见 12-field-slot.md 完整列表）       | 应为 value-or-region 但声明为纯 region（扫描扩展 2→14） |
| 17  | 12   | `flux-renderers-form-advanced/src/variant-field/variant-field.tsx:253` | 手动 FieldFrame 绕过 wrap/frameWrap                     |

---

## P3 清单（摘要）

共 35 项 P3 级别发现，分布在 9 个维度中：

| 维度 | P3 数量 | 主要类别                                                                                               |
| ---- | ------- | ------------------------------------------------------------------------------------------------------ |
| 04   | 9       | ref 桥接技术债务(3)、合理 UI 状态(4)、不完整实现(2)                                                    |
| 05   | 3       | report-designer 恒等选择器(3)                                                                          |
| 06   | 2       | refreshDerivedState stale guard、ELK 纯函数                                                            |
| 07   | 5       | ChartRenderer 效果拆分、ref 依赖、魔术键、hidden field 重复、ref-sync                                  |
| 08   | 7       | 路径所有权校验、并行验证、fire-and-forget 验证、闭包扩展等                                             |
| 09   | 5       | 20 个 RendererDefinition 缺少 displayName/sourcePackage(2) + as any 可移除(3) + ValidationRule 类型(1) |
| 10   | 5       | inline 颜色回退(3)、marker 带 background(1)、废弃 BEM class(1)                                         |
| 11   | 2       | error boundary 原生 button(1)、spreadsheet input(1)                                                    |
| 12   | 2       | loop empty 纯 region、detail-view 无 FieldFrame                                                        |

---

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                         | 涉及维度 | 发现数 |
| ------------------------------------------------------------ | -------- | ------ |
| `flux-renderers-data/src/crud-renderer.tsx`                  | 04, 07   | 3      |
| `flux-renderers-form/src/field-utils.tsx`                    | 04, 05   | 4      |
| `flux-react/src/field-frame.tsx`                             | 05       | 1      |
| `report-designer-core/src/core-dispatch.ts`                  | 06       | 1      |
| `report-designer-renderers/src/inspector-shell-renderer.tsx` | 04, 05   | 2      |

---

## 跨维度模式

### 1. executeSource signal 缺口（维度 06 + 07）— **已修复**

三个调用点（useSourceValue、node-source-prop-controller、DynamicRenderer）未将 AbortSignal 传给底层已支持取消的 API。修复：传递 signal。

### 2. report-designer-core 异步基础设施缺失（维度 06）

整个包零 AbortController。预览/导入/导出/refreshDerivedState 都缺少取消/stale guard。

### 3. ref 桥接 store 数据模式（维度 04）

array-editor、key-value、condition-builder 使用 useRef + useEffect 桥接 store 数据，用于 registration API 的同步 getValue()。已知技术债务。

### 4. useCurrentFormState 全 store 订阅（维度 05）

setValue 不调用 notifyPath，值变更只能通过全 store 订阅感知。equalityFn 和 conditional enablement 缓解了影响。

### 5. Widget renderer 缺少 root marker class（维度 10）— **扫描扩展 5→15**

tag-list、key-value、array-editor、input-tree、tree-select 五个原始发现，扫描新增 button、badge、input-text/email/password、textarea、object-field、array-field、variant-field、detail-field 共 10 个。修复成本极低（每个加一个 className）。

### 6. value-or-region 声明不完整（维度 12）— **扫描扩展 2→14**

原始发现 page/container header/footer。扫描新增 tabs toolbar、form body/actions、crud toolbar/bulkActions、detail-view viewer/content、detail-field viewer/content、object-field body。table header/footer 为死代码声明。

### 7. `as any` 类型转换（维度 09）— **扫描扩展 3→9**

原始 3 处 component 定义。新增 3 处 helpers.render(xxx as any)（可移除）、2 处 dispatch(xxx as any)（掩盖 undefined 风险）、1 处 ValidationRule 类型缺 custom 变体。

---

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- 文件大小超过 700 行由 `pnpm check:oversized-code-files` 和 ESLint `max-lines` 规则拦截
- React hooks exhaustive-deps 规则覆盖了大部分依赖项问题
- TypeScript strict mode 捕获了类型层面的不一致

---

## 建议新增的自动化检查

| 建议检查                              | 检测目标 | 实现方式                                                        |
| ------------------------------------- | -------- | --------------------------------------------------------------- |
| 禁止 `mountedRef` / `isMounted` 模式  | 竞态条件 | 自定义 ESLint 规则：检测 useRef(true) + useEffect 内 async 模式 |
| executeSource 调用缺少 signal         | 资源泄漏 | 暂不实现——需要先修改 API 契约                                   |
| report-designer-core 异步操作缺少取消 | 域包质量 | 暂不实现——仍在开发中                                            |

---

## 已修复项

| 问题                                      | 维度 | 修复方式                                                    |
| ----------------------------------------- | ---- | ----------------------------------------------------------- |
| DynamicRenderer mountedRef 竞态           | 07   | mountedRef → AbortController + signal 传给 executeApiObject |
| useSourceValue signal 未转发              | 06   | 加 `ctx: { signal }` 给 executeSource                       |
| node-source-prop-controller signal 未转发 | 06   | 加 `ctx: { signal: controller.signal }`                     |

## 可暂缓项

- 维度 04 的 9 个 P3 项（ref 桥接、合理 UI 状态、不完整实现）
- 维度 05 的 3 个 P3 项（report-designer 恒等选择器）
- 维度 06 的 2 个 P3 项
- 维度 07 的 5 个 P3 项
- 维度 08 的 7 个 P3 项（Phase 3 功能、注释补充等）
- 维度 09 的 5 个 P3 项（缺少 displayName/sourcePackage、as any 可移除、ValidationRule 类型）
- 维度 10 的 5 个 P3 项
- 维度 11 的 2 个 P3 项
- 维度 12 的 2 个 P3 项

---

## 同类问题扫描总结（7 个扫描任务）

| 扫描目标              | 发现                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| mountedRef 模式       | 已全部清除，新增 variant-field.tsx 1 处竞态（P2）                                                           |
| 内部区域 nop-\* class | crud 3 处 + designer-palette 1 处（低风险）                                                                 |
| as any 扩展           | 3→9 处：3 component + 3 helpers.render + 2 dispatch + 1 ValidationRule                                      |
| 缺少 marker class     | 5→15 个 widget 渲染器                                                                                       |
| value-or-region 声明  | 2→14 处 + table header/footer 死代码                                                                        |
| inline 硬编码颜色     | 已知 7 处 CSS variable fallback + 新增 designer-node-appearance.ts 15 个 hex                                |
| domain 包异步取消     | spreadsheet-core 无风险、flow-designer 低风险、word-editor 极低、report-designer 高风险（6 处真正异步 I/O） |

---

## 误报排除清单

| 原始发现                                             | 排除理由                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| D05: useSurfaceScopeSnapshot 恒等选择器              | 设计意图：Surface 全量脏标记，返回值被忽略                        |
| D05: useFieldPresentation 新闭包                     | useSyncExternalStoreWithSelector 不依赖 selector 引用稳定性       |
| D07: ReportDesignerPage refreshFieldSources on mount | 构造→effect 触发异步初始化是 React 标准模式                       |
| D08: sourceKind 扩展了文档定义                       | 代码类型定义本身即规范，应更新文档而非代码                        |
| D08: CompiledValidationNodeKind 是子集               | Phase 3 规划功能，当前实现正确                                    |
| D08: 编译时无 owner boundary 分区                    | Phase 2+ 架构增强，当前 childContracts 机制足够                   |
| D09: condition-builder className 未用 cn()           | wrap: true 渲染器由 FieldFrame 处理 className，内部静态字符串正确 |
| D11: word-editor input[type=file]                    | UI 库无 FileInput 替代                                            |
| D11: word-editor input[type=color]                   | UI 库无 ColorPicker 替代                                          |
| D12: variant-field action 字段应为 event             | ignored 是正确的：需要原始 action schema 注入自定义 args          |
