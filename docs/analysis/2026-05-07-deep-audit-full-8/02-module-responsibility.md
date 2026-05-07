# 维度 02: 模块职责与文件边界

## 深挖轮次

- 第 1 轮: 基于 `pnpm check:oversized-code-files`，发现多个 >500 文件职责混合候选。
- 第 2 轮: 追加 `flow-designer` manifest 静态契约大文件候选。
- 第 3 轮: 追加 flow core/page、parser、hooks、node-renderer、validation/reaction、debugger styles、playground demo 等候选。
- 第 4 轮: 追加 `word-editor-core` third-party public re-export、spreadsheet root side effects/internal exports、i18n React coupling、report designer 深度组合 spreadsheet internals。
- 第 5 轮: 追加 `flux-i18n` headless/React adapter 未隔离、report designer spreadsheet 内部组合问题。

## 维度复核结论

### 保留

| 文件                                                                                        | 严重程度 | 复核理由                                                                                                            |
| ------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `packages/flux-compiler/src/schema-compiler.ts`                                             | P2       | `compileSingleNode` 与 compile/prepare/validate 仍承载多阶段职责                                                    |
| `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`    | P3       | ReactFlow 适配、tree overlays、minimap DOM patch、viewport sync、drag/drop 混合                                     |
| `packages/word-editor-renderers/src/word-editor-page.tsx`                                   | P2       | stores/bridge/recovery/save/host scope/action provider/panels/UI 聚合                                               |
| `packages/flow-designer-renderers/src/designer-page.tsx`                                    | P2       | renderer page 同时做 mode setup, core, namespace, host scope, dialogs, shell                                        |
| `packages/flux-react/src/hooks.ts`                                                          | P2       | runtime/scope/action/import/form/validation/page/status hooks 混在公共 hook file                                    |
| `packages/flux-react/src/node-renderer.tsx`                                                 | P2       | node resolution, subscriptions, source props, events, regions, providers, lifecycle, import frame 聚合              |
| `packages/word-editor-core/src/index.ts`                                                    | P2       | root public entry re-export `@hufe921/canvas-editor` 类型/枚举，泄露第三方 API                                      |
| `packages/spreadsheet-renderers/src/index.ts`                                               | P2       | root entry 引入 CSS side effect，并公开 `SpreadsheetGrid`, `SheetTabBar`, `useSpreadsheetInteractions` 等内部组合件 |
| `packages/flux-i18n/src/i18n.ts`, `hooks.ts`                                                | P2       | headless i18n 初始化直接安装 `initReactI18next`，root 同时导出 core API 与 React hook                               |
| `packages/report-designer-renderers/src/page-renderer.tsx`, `report-spreadsheet-canvas.tsx` | P1       | report shell 直接创建 spreadsheet core/bridge/provider，并消费 spreadsheet grid/tab/interactions 内部 UI            |

### 降级

- `input.tsx`, `runtime-factory.ts`, `spreadsheet-grid.tsx`, `form-store.ts`, `flow-designer-core/src/core.ts`, `form-runtime-validation.ts`, `reaction-runtime.ts`, playground demo: 文件偏大但职责相对集中或为 demo/orchestrator。

### 驳回

- `designer-manifest.ts`: 静态 manifest 大表不构成职责漂移。
- `flux-formula/src/parser.ts`: recursive-descent parser 职责集中。
- `nop-debugger/src/panel/styles-css.ts`: CSS 字符串资产，维度 02 不保留。

## 最终保留项

- 优先处理 `report-designer-renderers` 对 spreadsheet internals 的深层耦合。
- 将 `word-editor-core` third-party API re-export 收敛为自有 adapter 类型。
- 后续分批拆分 `schema-compiler.ts`, `word-editor-page.tsx`, `designer-page.tsx`, `flux-react/hooks.ts`, `node-renderer.tsx`。
