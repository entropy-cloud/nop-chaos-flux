# 深度审核汇总报告

## 审核范围

- 执行的维度：01-20 全量维度。
- 覆盖的包：`flux-core`、`flux-formula`、`flux-compiler`、`flux-action-core`、`flux-runtime`、`flux-react`、`flux-bundle`、`flux-renderers-basic`、`flux-renderers-form`、`flux-renderers-form-advanced`、`flux-renderers-data`、`flux-code-editor`、`flow-designer-core`、`flow-designer-renderers`、`spreadsheet-core`、`spreadsheet-renderers`、`report-designer-core`、`report-designer-renderers`、`word-editor-core`、`word-editor-renderers`、`nop-debugger`、`ui`、`theme-tokens`、`tailwind-preset`、`apps/playground`、`tests/e2e`、`docs/*`。
- 审核日期：2026-05-24。
- 执行方式：20 个维度多轮迭代深挖，随后每个维度独立复核；P0/P1、跨包边界、文档-代码违约、会驱动代码修改与争议项继续做分层子项复核。
- 归档目录：`docs/analysis/2026-05-24-deep-audit-full/`。

## 深挖统计

- 维度总数：20。
- 深挖总轮次：106。
- 深挖发现总数：156。
- 最终保留项：152。

| 维度 | 深挖轮次 | 深挖发现 | 最终保留 |
| ---- | -------: | -------: | -------: |
| 01   |        5 |        7 |        7 |
| 02   |        7 |       14 |       14 |
| 03   |        7 |       14 |       13 |
| 04   |        4 |        5 |        5 |
| 05   |        1 |        0 |        0 |
| 06   |        3 |        2 |        2 |
| 07   |        1 |        1 |        1 |
| 08   |        1 |        0 |        0 |
| 09   |        6 |        9 |        9 |
| 10   |       12 |       18 |       18 |
| 11   |        8 |        8 |        7 |
| 12   |        6 |        7 |        7 |
| 13   |        6 |        7 |        7 |
| 14   |        4 |       10 |       10 |
| 15   |        6 |        5 |        5 |
| 16   |       13 |       16 |       16 |
| 17   |        2 |        1 |        1 |
| 18   |        6 |       10 |       10 |
| 19   |        3 |        5 |        5 |
| 20   |        5 |       17 |       15 |

## 复核统计

- 维度级复核完成数：20/20。
- 子项复核覆盖条目数：95。
- 保留原严重度：137。
- 降级后保留：15。
- 驳回：4。
- 最终保留严重度分布：P0=1，P1=26，P2=106，P3=19。

## P0 清单

| 编号      | 文件路径                                                                                                                                           | 摘要                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 维度16-01 | `docs/index.md`; `docs/architecture/playground-experience.md`; `docs/architecture/debugger-runtime.md`; `docs/references/maintenance-checklist.md` | Active docs 仍指向已归档 analysis 路径，导致 `pnpm check:active-doc-code-anchors` hard gate 失败。 |

## P1 清单

| 编号      | 文件路径                                                                                                                                                                                                              | 摘要                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 维度01-03 | `packages/flux-action-core/src/action-dispatcher/program-utils.ts`; `packages/flux-action-core/package.json`                                                                                                          | `flux-action-core` 运行时依赖 `flux-compiler` 并在 dispatch 路径调用 `compileActions`。                          |
| 维度01-04 | `packages/flux-react/src/hooks.ts`; `packages/flux-react/src/helpers.tsx`; `packages/flux-react/src/render-nodes.tsx`                                                                                                 | `flux-react` 主渲染链仍存在生产值导入循环，`pnpm audit:deps` 仍失败。                                            |
| 维度02-01 | `packages/flux-runtime/src/runtime-factory.ts`                                                                                                                                                                        | `runtime-factory.ts` 仍直接实现 module cache、prepared import 加载/缓存/错误包装和 scope 创建。                  |
| 维度03-01 | `packages/flux-react/package.json`; `packages/flux-react/src/unstable.ts`                                                                                                                                             | `flux-react` 仍发布 `./unstable`，且多个生产 renderer 主路径继续导入该 surface。                                 |
| 维度03-02 | `packages/flow-designer-renderers/src/designer-manifest.ts`; `packages/flow-designer-renderers/src/designer-action-provider.ts`                                                                                       | Flow `moveNodes.deltas` 仍是空 object shape，provider 强转后进入 core。                                          |
| 维度03-03 | `packages/report-designer-renderers/src/report-designer-manifest.ts`; `packages/report-designer-renderers/src/host-action-provider.ts`                                                                                | Report `preview.mode` manifest 仍是任意 string，provider 强转绕过 core union。                                   |
| 维度03-04 | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`; `packages/spreadsheet-renderers/src/host-action-provider.ts`                                                                                            | Spreadsheet 多个公开 methods 仍无 `args` shape，provider 接受 object payload 后强转。                            |
| 维度03-05 | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`                                                                                                                                                          | Spreadsheet `selection.kind` 与 `findOptions.searchScope` 仍发布为宽 string。                                    |
| 维度03-06 | `packages/flow-designer-renderers/src/designer-manifest.ts`; `packages/flow-designer-renderers/src/designer-action-provider.ts`                                                                                       | Flow `moveBranch.direction` 仍发布为 string，provider 将非 `left` 值静默改写为 `right`。                         |
| 维度03-13 | `packages/flux-core/src/schema-diagnostics/manifest.ts`; `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts`                                                                                  | `FluxObjectShape` 仍无开闭语义，compiler 与各 provider 对未知字段行为不一致。                                    |
| 维度03-14 | `packages/report-designer-renderers/src/report-designer-manifest.ts`; `packages/report-designer-renderers/src/host-data.ts`                                                                                           | Report projection manifest 声明部分字段必有或 `null                                                              | object`，但运行时发布 optional/条件 `undefined`。 |
| 维度07-01 | `packages/flux-renderers-basic/src/use-surface-renderer.ts`                                                                                                                                                           | Declarative surface child scope 在 render/useMemo 路径创建，违反 runtime-owned scope after-commit 分配要求。     |
| 维度09-01 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`                                                                                                                                           | `variant-field` 回读 raw schema 渲染 `hint` / `description`，绕过 normalized value-or-region 通道。              |
| 维度09-02 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts`                                                                                                                                 | `detectVariantAction` 已声明为 event，但 controller 优先读取 authored schema 并自行 dispatch。                   |
| 维度09-03 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts`                                                                                                                                 | variant switch migration 从 authored schema option 读取 `transformInAction`，未消费 normalized `variants` prop。 |
| 维度09-05 | `packages/flux-renderers-data/src/crud-renderer.tsx`                                                                                                                                                                  | `crud.queryForm` 是 prop，renderer 运行期拼 form schema 并 `helpers.render()`。                                  |
| 维度09-06 | `packages/flow-designer-renderers/src/renderer-definitions.ts`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx`; `packages/flow-designer-renderers/src/designer-page-body.tsx` | `designer-page.config` 内 schema input 被原样保留，canvas/dialog 路径运行期渲染。                                |
| 维度09-08 | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`                                                                                                                                           | `columns[].quickEdit.body` 仍可留在 prop 内并由 quick edit cell 运行期 `helpers.render()`。                      |
| 维度12-01 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`                                                                                                                                           | `variant-field` 仍回读 raw `hint/description` 并重新 fragment render，绕过 normalized field chrome slot 通道。   |
| 维度12-05 | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`; `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`                                                                     | `detail-field/detail-view` 仍把 value-adaptation action slots 声明为普通 prop。                                  |
| 维度12-07 | `packages/flux-renderers-basic/src/basic-renderer-definitions.ts`; `packages/flux-renderers-basic/src/dynamic-renderer.tsx`                                                                                           | `dynamic-renderer.loadAction` 文档声明为 event，但 RendererDefinition 仍是 prop 且运行时直接 dispatch。          |
| 维度14-01 | `tests/e2e/flow-designer-edge-creation.spec.ts`                                                                                                                                                                       | Flow Designer 连线创建 active E2E 仍只有 synthetic event proof，真实拖拽测试仍 skip。                            |
| 维度16-02 | `scripts/check-active-doc-code-anchors.mjs`; `docs/architecture/performance-design-requirements.md`; `docs/architecture/array-field.md`                                                                               | active-doc anchor hard gate 扫描范围过窄，遗漏其他 active owner docs 失效路径。                                  |
| 维度20-10 | `packages/word-editor-renderers/src/editor-canvas.tsx`; `packages/word-editor-renderers/src/word-editor-page.tsx`                                                                                                     | Word Editor canvas host 没有可访问边界或备用编辑语义。                                                           |
| 维度20-12 | `packages/flux-code-editor/src/code-editor-renderer.tsx`; `packages/flux-code-editor/src/use-code-mirror.ts`                                                                                                          | Code Editor 的真实编辑面没有可访问名称与错误关联。                                                               |
| 维度20-13 | `packages/flow-designer-renderers/src/designer-xyflow-canvas/render-ports.tsx`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`                                              | Flow Designer 连线/重连只能通过指针 Handle 完成，缺少键盘等价流程。                                              |

## 高频问题文件

| 文件路径                                                                                    | 相关维度                   | 主题                                                                                                                         |
| ------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `packages/flow-designer-renderers/src/designer-action-provider.ts` / `designer-manifest.ts` | 03, 18                     | host action manifest 与 provider 契约过宽、provider 模板分叉。                                                               |
| `packages/spreadsheet-renderers/src/*`                                                      | 03, 04, 10, 15, 20         | manifest shape、viewport ownership、CSS scope/theme、snapshot subscription、a11y 状态表达。                                  |
| `packages/flux-renderers-form-advanced/src/variant-field/*`                                 | 09, 12                     | raw schema 回读、event/action slot 旁路、field slot 建模漂移。                                                               |
| `packages/flux-renderers-data/src/table-renderer/*`                                         | 09, 11, 18                 | raw schema fallback、radio primitive 绕过、event payload 不一致。                                                            |
| `packages/flux-code-editor/src/*`                                                           | 01, 02, 10, 12, 13, 18, 20 | manifest dependency、host transport fallback、theme inheritance、field meta、dynamic guard、validation participation、a11y。 |
| `docs/components/package-splitting-strategy.md`                                             | 16                         | 包状态、目标结构和依赖矩阵均与 live package manifest 漂移。                                                                  |
| `packages/nop-debugger/src/*`                                                               | 01, 10, 11, 18, 19, 20     | dependency cycle、runtime style injection、tabs/disclosure/a11y、monitor details。                                           |

## 跨维度模式

- Host manifest / provider / core 类型不一致：集中在 Flow、Spreadsheet、Report、Word host action surfaces，表现为 string 过宽、无 args method 接受 payload、object shape 开闭语义不统一、provider 强转。
- Renderer raw schema 旁路：`variant-field`、`crud.queryForm`、`designer-page.config`、table quickEdit/buttons、`report-inspector.body`、`dynamic-renderer.loadAction` 都在不同程度上绕过 precompiled region/event/action 通道。
- CSS token 与公共主题契约漂移：`theme-tokens` 根默认缺口、Tailwind preset 映射旧 token、公共 UI base/toaster/popover 与 HSL 分量 token 不匹配、package CSS scope 泄漏。
- 文档与 live baseline 漂移：active docs anchor hard gate 失败，组件 roadmap/index/manifest 与 registered definitions 不一致，package splitting 文档混淆 current/future/completed 状态。
- 复杂设计器 a11y 缺口：Flow/Spreadsheet/Word/CodeEditor 的 pointer-only、canvas/editor host boundary、focus return、state announcement、tab semantics 仍需要系统性收敛。
- 测试 proof fidelity：部分 E2E 使用 synthetic/debug/probe 通道证明关键用户路径；部分大测试文件与 spy cleanup 仍影响可维护性。

## 已自动化的检查项

- `pnpm check:workspace-manifest-deps`：基线通过，但本轮发现仍指出生产 imports 与 manifest devDependencies 的具体 residual。
- `pnpm check:package-css-exports`：基线通过。
- `pnpm check:flux-bundle-pack`：基线通过，但 peer 校验覆盖面描述需收敛。
- `pnpm check:schema-prop-coverage`：100%，88/88。
- `pnpm check:oversized-code-files`：93 warnings，0 errors；本轮只报告职责混合且高价值的测试/源码文件。
- `pnpm check:audit-*` suspect scripts：已作为候选源消费，所有保留项均经过 live code 复核。
- `pnpm audit:deps`：复核时仍失败，支撑 01 维度依赖循环发现。
- `pnpm check:active-doc-code-anchors`：复核时仍失败，支撑 P0 文档锚点发现。

## 建议新增或强化的自动化检查

- 扩展 `check-active-doc-code-anchors`：按 active docs 目录发现扫描，显式排除 archive/logs/analysis/plans，覆盖当前漏报 owner docs。
- 增加 host manifest/provider contract tests：校验 args required/forbidden、literal union、object open/closed semantics、projection absent `null/undefined` 语义。
- 增加 `RendererDefinition.componentCapabilityContracts` shape 编译/运行时校验测试，覆盖 `component:*` action payload。
- 增加 renderer raw schema fallback suspect：定位 `helpers.render()` / `RenderNodes` / `useRenderFragment()` 消费 authored prop/schema 而非 region/event/action 通道的路径。
- 增加 theme token validity tests：验证 public token stylesheet 在无 `data-theme/data-mode` 时基础 colors、popover/sidebar/destructive/toaster/base.css 仍解析为有效 CSS color。
- 增加 E2E hygiene check：默认 suite 排除 `diagnostic` / screenshot / DOM dump / probe-only specs，或要求显式 tag/project。
- 增加 a11y smoke tests：覆盖 CodeMirror content attributes、React Flow handles keyboard path、dialog draggable keyboard fallback、spreadsheet toolbar `aria-pressed`。

## React 19 最佳实践合规性

- 本次未改业务代码，未新增 `React.memo`、`useCallback`、`useMemo` 等手写优化。
- 维度07保留了一个 React 19 相关 P1：`useSurfaceRenderer` 在 render/useMemo 路径创建 runtime-owned child scope，违反 render phase 不分配 runtime resource 的基线，应优先迁移到 commit-safe effect/owner lifecycle。
- 其它 React 19 风险主要体现在 render-time raw schema 渲染、wide subscription 和 state mirror，而非新增 hook 用法。

## 可暂缓项

- P3 命名/文案/selector scope 项可与对应包的 cleanup 批次合并处理：`维度17-01`、`维度18-03`、`维度18-05`、`维度18-06`、`维度10-01`、`维度10-04`、`维度10-18`。
- 测试文件拆分和 spy cleanup 中 P2/P3 项可按包维护窗口分批处理，优先级低于 P0/P1 contract/runtime/a11y 问题。
- 部分模块职责降级项（`维度02-02`、`维度02-08`、`维度02-09`、`维度02-10`）当前 owner docs 已接受现状，可作为后续瘦身计划，而非立即阻断项。

## 误报排除清单

- `维度03-08`：Flow tree insertion commands 当前不是 host manifest/provider public surface，驳回。
- `维度11-08`：Nop Debugger disclosure 当前 owner doc 明确基线为 `Button + aria-expanded/aria-controls`，不按 Collapsible 绕过定性。
- `维度20-04`：Report field panel 已有 keyboard-accessible Insert path，原发现对“拖到任意目标”的等价要求过高。
- `维度20-05`：Spreadsheet row/column resize 的 keyboard baseline 已文档化为 header button + context menu + size dialog，mouse handle `aria-hidden` 是文档化例外。
- 维度05、维度08：独立复核后仍为零最终保留项。
