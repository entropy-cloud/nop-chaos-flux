# 深度审核汇总报告

## 审核范围

- 执行的维度：01-20 全部维度
- 覆盖的包：`packages/*`、`apps/playground`、相关 `docs/*`
- 审核日期：2026-05-15
- 执行方式：按手册批次完成多轮初审深挖、独立维度复核，以及对 P1/关键跨边界条目的逐项子项复核

## 深挖统计

- 维度总数：20
- 各维度深挖轮次：01=2, 02=1, 03=1, 04=2, 05=2, 06=2, 07=1, 08=1, 09=2, 10=1, 11=1, 12=1, 13=1, 14=1, 15=2, 16=1, 17=1, 18=1, 19=1, 20=1
- 深挖总轮次：26
- 深挖总发现数：52

## 复核统计

- 深挖发现总数：52
- 已独立复核条目数：52
- 维度级复核完成数：20
- 子项逐条复核数：22
- 保留：28
- 降级：19
- 驳回：5

## P0 清单（按文件分组）

无。

## P1 清单（按文件分组）

| 编号  | 文件                                                                                | 一句话摘要                                                   |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 04-02 | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`             | detail commit 在父 owner 写回后才做 parent validation        |
| 04-03 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`         | non-form variant switch 未写回父 owner                       |
| 04-04 | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`    | quick-edit 草稿直接发布进共享 `rowScope.record`              |
| 05-03 | `packages/flux-react/src/use-node-source-props.ts`                                  | source-enabled 节点对普通 resolved props 暴露 stale snapshot |
| 05-04 | `packages/flux-renderers-form/src/field-utils/field-presentation.tsx`               | 字段展示 hook 欠订阅跨字段 required 与提交态                 |
| 06-01 | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                             | submit abort 未贯穿 validation owner                         |
| 06-02 | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts` | Undo/Redo resolved failure 被静默吞掉                        |
| 07-01 | `packages/flux-react/src/use-node-source-props.ts`                                  | scope 切换不会重绑 source observer                           |
| 08-01 | `packages/flux-runtime/src/form-runtime-owner.ts`                                   | 等待 active 后仍使用旧 validation 快照                       |
| 08-02 | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                             | `summary-gate` 实际递归触发 child submit 校验                |
| 08-03 | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`        | non-form owner 下丢失当前 `ValidationScopeRuntime`           |
| 08-05 | `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`  | value-adaptation 成功时越权清掉同 path 非本来源错误          |
| 09-01 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`         | wrapped 路径的 canonical control root 丢失 `meta.className`  |
| 10-01 | `packages/flux-react/src/default-spacing.css`                                       | 裸 `data-slot` 选择器跨包命中 `@nop-chaos/ui` 同名 slot      |
| 12-01 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`         | action-like 字段仍被建模为 `prop` 并在渲染期求值             |
| 12-02 | `packages/flux-renderers-data/src/data-renderer-definitions.ts`                     | quick-save 行级 action 仍被建模为 `prop`                     |
| 14-01 | `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx`    | 新装 `window.confirm` 后未完整恢复                           |
| 16-06 | `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`     | Phase 1 已标完成但主 exit criteria 仍未满足                  |
| 20-02 | `packages/flux-renderers-data/src/tree-renderer.tsx`                                | 数据树 renderer 的 treeitem 焦点入口与树导航不完整           |

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                                        | 维度       | 说明                                                                     |
| --------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `packages/flux-react/src/use-node-source-props.ts`                          | 05, 07, 15 | 同时存在 stale snapshot、scope lifecycle 绑定缺口和 stringify 热路径判定 |
| `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` | 04, 09, 12 | 同时存在 owner writeback、renderer root contract、action field 建模问题  |
| `packages/flux-runtime/src/form-runtime-submit-flow.ts`                     | 06, 08     | submit abort 与 validation scope 分类均有真实缺陷                        |
| `packages/flux-renderers-form-advanced/src/detail-view/*`                   | 04, 08     | staged owner commit 与 validation overlay 清理都存在问题                 |

## 跨维度模式

- source-aware runtime/react integration 在 `use-node-source-props` 附近同时暴露订阅精度、生命周期与性能问题，说明该基建点需要成组收敛。
- advanced field family 的 owner 语义、action field 建模和 renderer root contract 仍存在跨文件残留，不宜只做单点修补。
- validation owner 与 staged child owner 的边界在 detail/summary-gate 路径上仍不稳，属于验证子系统核心风险区。
- public CSS / slot contract 仍有 facade 与 package-level 作用域泄漏残留，主要集中在 Flux 默认样式层。

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- workspace manifest source imports
- React 19 legacy API
- src 产物泄漏
- CSS export 指向 `dist`
- i18n used-key 缺失
- renderer definition `fields-only` guard
- `eval` / `new Function`
- oversized file 的 `>700` 硬错误

## 建议新增的自动化检查

- 检查 field metadata 中 `*Action` / action-intent 字段误标为 `prop`
- 检查 `useScopeSelector` 单路径 `getIn(...)` 但未传 `paths`
- 检查 `useNodeSourceProps` / source controller 对普通 resolved props 的 stale snapshot 回归
- 检查 public facade CSS 中失效 selector / BEM 残留
- 检查活跃 plan phase 标记与未勾选 exit criteria 的冲突

## 可暂缓项（有问题但 ROI 暂时不高）

- 02-07 `flow-designer-renderers/src/index.tsx` 入口泄露实现
- 05-01 / 05-02 broad scope fallback 收窄
- 10-02 facade CSS 失效 BEM selector
- 15-01 source input stringify 热路径
- 18-01 repo-level package 模板约定失真

## 误报排除清单（看起来像问题但不建议动）

- spreadsheet grid/raw table 结构本身属于高性能宿主表面，不作为 UI 组件违规处理
- `object-field` 的 adapted working value 保留态不再按 P1 双状态问题处理
- `crud-renderer.tsx` 与 `report-designer page-renderer.tsx` 当前更像厚重 orchestrator，而非明确 owner 越界
- `word-editor-page` region override 文档问题更像展示不齐，不作为独立跨包 contract 缺陷保留
- `input-tree/tree-select` 的 a11y 问题更准确是树模式不完整而非基本不可用
